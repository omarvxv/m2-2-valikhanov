class Application {
    /*реализующий обработку нажатия на кнопку, 
    получение введенных данных и отображение результатов.*/
    constructor() {
        document.querySelector('[name=submit]').addEventListener('click', this.handleButtonClick);
        document.querySelector('.calculatorBlock').addEventListener('keypress', (event) => {
            if(event.key === 'Enter'){
                this.handleButtonClick();
            }
        });
    }

    handleButtonClick() {
        const initialAmount = document.getElementById('initialAmount').value;
        const monthlyRefill = document.getElementById('monthlyRefill').value;
        const period = document.getElementById('period').value;
        const currency = document.getElementById('currency').value;
        const container = document.querySelector('table');

        const clientQuery = new Deposit(initialAmount, monthlyRefill, period, currency);
        if (clientQuery.check) {
            const bestSuggestions = new BankProduct(clientQuery);
            const calculator = new Calculator(bestSuggestions, clientQuery);
            const table = calculator.getTable();

            if (table.length === 1) {
                container.innerHTML = 'Нет подходящих результатов!';
            } else {
                container.innerHTML = table.join('');
            }
        }else{
            container.innerHTML = '';
        }
    }
}

class Calculator {
    /* инициализирующийся массивом продуктов 
    BankProduct и вычисляющий наиболее выгодный вариант. */
    constructor(bestSuggestions, { initialAmount, monthlyRefill, period, currency }) {
        this.bestSuggestions = bestSuggestions;
        this.initialAmount = initialAmount;
        this.monthlyRefill = monthlyRefill;
        this.period = period;
        this.currency = currency;
    }
    getTable() {
        const self = this;
        const bestSuggestions = this.bestSuggestions;
        return this.generateTable(bestSuggestions, self);
    }
    generateTable(bestSuggestions, clientData) {
        const table = [];
        table[0] = '<tr><th>Название банка</th><th>Вклад</th><th>Процент</th><th>Итоговая сумма</th></tr>';
        for (let i = 0; i < bestSuggestions.length; i++) {
            let bankName = bestSuggestions[i].bankName;
            let investName = bestSuggestions[i].investName;
            let percent = bestSuggestions[i].incomeType;
            let finalAmount = this.calculateFinalAmount(bestSuggestions[i], clientData);
            table.push(this.generateRow(bankName, investName, percent, finalAmount));
        }
        return table;
    }
    generateRow(bankName, investName, percent, finalAmount) {
        const bankNamePart = '<td>' + bankName + '</td>';
        const investNamePart = '<td>' + investName + '</td>';
        const percentPart = '<td>' + percent + '</td>';
        const finalAmountPart = '<td>' + finalAmount + '</td>';

        let row = '<tr>' + bankNamePart + investNamePart + percentPart + finalAmountPart + '</tr>';
        return row;
    }
    calculateFinalAmount(suggestion, clientData) {
        let finalAmount = clientData.initialAmount;
        for (let i = 0; i < clientData.period; i++) {
            if (i < clientData.period-1) {
                finalAmount += finalAmount * suggestion.incomeType / 100 / 12 + clientData.monthlyRefill;
            } else {
                finalAmount += finalAmount * suggestion.incomeType / 100 / 12;
            }
        }
        return Math.round(finalAmount);
    }
}

class BankProduct {
    /* реализующий свойства и функциональность банковского предложения по вкладу */
    constructor({ initialAmount, monthlyRefill, period, currency }) {
        const data = JSON.parse(jsonData);
        const product = { initialAmount, monthlyRefill, period, currency };

        return this.filterProduct(data, product);

    }
    filterProduct(data, product) {
        // возвращает отфильтрованное предложение по всем критериям
        let curFilter = this.filterForCurrency(data, product);
        let isRefillFilter = this.filterForRefill(curFilter, product);
        let minTermFilter = this.filterForMinPeriod(isRefillFilter, product);
        let maxTermFilter = this.filterForMaxPeriod(minTermFilter, product);
        let minAmountFilter = this.filterForMinAmount(maxTermFilter, product);
        let maxAmountFilter = this.filterForMaxAmount(minAmountFilter, product);

        const maxPercent = this.getMaxPercent(maxAmountFilter);
        const bestSuggestions = this.getBestSuggestions(maxAmountFilter, maxPercent);
        return bestSuggestions;
    }
    filterForCurrency(data, product) {
        // фильтр по валюте
        return data.filter(suggestion => {
            return suggestion.currency === product.currency;
        });
    }
    filterForRefill(data, product) {
        // фильтр по возможности пополнять депозитный счёт
        if (product.monthlyRefill > 0) {
            return data.filter(suggestion => {
                return suggestion.canDeposit === true;
            });
        } else {
            return data;
        }
    }
    filterForMinAmount(data, product) {
        // фильтр по минимальной депозитной ставке
        return data.filter(suggestion => {
            return product.initialAmount >= suggestion.sumMin;
        });
    }
    filterForMaxAmount(data, product) {
        // фильтр по максимальной возможности увеличения депозитного баланса
        return data.filter(suggestion => {
            if (suggestion.sumMax != null) {
                let calculate = new Calculator(suggestion, product);
                let finalAmount = calculate.calculateFinalAmount(suggestion, product);
                return finalAmount <= suggestion.sumMax;
            } else {
                return true;
            }
        });
    }
    filterForMinPeriod(data, product) {
        // фильтр по минимальному сроку
        return data.filter(suggestion => {
            return product.period >= suggestion.termMin;
        });
    }
    filterForMaxPeriod(data, product) {
        // фильтр по максимальному сроку
        return data.filter(suggestion => {
            return product.period <= suggestion.termMax;
        });
    }
    getMaxPercent(suggestList) {
        // получение максимальной процентной ставки
        const percentList = suggestList.reduce((result, suggestion) => {
            result.push(suggestion.incomeType);
            return result;
        }, []);
        return Math.max.apply(null, percentList);
    }
    getBestSuggestions(suggestList, maxPercent) {
        // получение лучших предложений
        return suggestList.filter(suggestion => {
            return suggestion.incomeType === maxPercent;
        });
    }
}

class Deposit {
    /* реализующий свойства и функциональность
     вклада, который хотел бы открыть клиент. */
    constructor(initialAmount, monthlyRefill, period, currency) {
        this.initialAmount = initialAmount;
        this.monthlyRefill = monthlyRefill;
        this.period = period;
        this.currency = currency.toUpperCase();
        this.check = true;

        if (this.findError() != '') {
            alert(this.findError());
            this.check = false;
        }
    }
    findError() {
        let errorLog = '';
        if(!this.initialAmount || !this.monthlyRefill || !this.period){
            errorLog += 'Все поля должны быть заполнены.\n';
        }
        if (this.initialAmount < 0 || isNaN(+this.initialAmount)) {
            errorLog += 'Начальная сумма должна быть не отрицательным числом.\n';
        }
        if (this.monthlyRefill < 0 || isNaN(+this.monthlyRefill)) {
            errorLog += 'Сумма ежемесячного пополнения должна быть не отрицательным числом.\n';
        }
        if (this.period < 0 || Math.trunc(this.period) != this.period || isNaN(+this.period)) {
            errorLog += 'Срок вклада должна быть положительным целым числом.\n';
        }
        if (!(this.currency !== 'RUB' ^ this.currency !== 'USD')) {
            errorLog += 'Поле "валюта вклада" содержит ошибку ввода.';
        }
        this.initialAmount = +this.initialAmount;
        this.monthlyRefill = +this.monthlyRefill;
        this.period = +this.period;
        return errorLog;
    }
}
new Application();
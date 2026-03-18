// Responsible for tracking money, purchases, and income.
// - Starts with an initial balance
// - Offers methods to earn money and spend money
// - Provides simple guard rails (cannot go below zero)

export class Economy {
  constructor({startingMoney = 10000} = {}) {
    this.balance = startingMoney;
  }

  earn(amount) {
    this.balance += amount;
  }

  spend(amount) {
    if (amount > this.balance) {
      return false;
    }
    this.balance -= amount;
    return true;
  }
}

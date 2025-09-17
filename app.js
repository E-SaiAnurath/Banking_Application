// Mini Banking app demonstrating Observer, Strategy and Command patterns

// -------------------------
// Observer pattern
// -------------------------
class NotificationCenter {
  constructor() { this.messages = []; }
  notify(msg) {
    this.messages.unshift({msg, time: new Date()});
    UI.renderNotifications(this.messages);
  }
}

// -------------------------
// Strategy pattern
// -------------------------
class InterestStrategy { calculate(account) { return 0; } }
class SavingsInterest extends InterestStrategy {
  calculate(account) { return +(account.balance * 0.04).toFixed(2); }
}
class FixedInterest extends InterestStrategy {
  calculate(account) { return +(account.balance * 0.07).toFixed(2); }
}
class CurrentInterest extends InterestStrategy {
  calculate(account) { return +(account.balance * 0.01).toFixed(2); }
}

// -------------------------
// Account with Observer
// -------------------------
class Account {
  constructor(id, owner, type='savings', balance=0) {
    this.id = id; this.owner = owner; this.type = type; this.balance = balance;
    this.observers = [];
    this.setInterestStrategy();
  }
  setInterestStrategy(){
    if(this.type==='savings') this.interestStrategy = new SavingsInterest();
    else if(this.type==='fixed') this.interestStrategy = new FixedInterest();
    else this.interestStrategy = new CurrentInterest();
  }
  attach(observer){ this.observers.push(observer); }
  notifyAll(message){ this.observers.forEach(o=>o.notify(message)); }
  deposit(amount){
    this.balance = +(this.balance + amount).toFixed(2);
    this.notifyAll(`${this.owner} deposited ₹${amount}. Balance ₹${this.balance}`);
  }
  withdraw(amount){
    if(this.balance < amount) throw new Error('Insufficient funds');
    this.balance = +(this.balance - amount).toFixed(2);
    this.notifyAll(`${this.owner} withdrew ₹${amount}. Balance ₹${this.balance}`);
  }
  applyInterest(){
    const interest = this.interestStrategy.calculate(this);
    this.balance = +(this.balance + interest).toFixed(2);
    this.notifyAll(`${this.owner} interest ₹${interest} applied. Balance ₹${this.balance}`);
    return interest;
  }
}

// -------------------------
// Command pattern
// -------------------------
class Command { execute(){} undo(){} }
class DepositCommand extends Command {
  constructor(account, amount){ super(); this.account=account; this.amount=amount; }
  execute(){ this.account.deposit(this.amount); }
  undo(){ this.account.withdraw(this.amount); }
  toString(){ return `Deposit ${this.amount} -> ${this.account.owner}`; }
}
class WithdrawCommand extends Command {
  constructor(account, amount){ super(); this.account=account; this.amount=amount; }
  execute(){ this.account.withdraw(this.amount); }
  undo(){ this.account.deposit(this.amount); }
  toString(){ return `Withdraw ${this.amount} -> ${this.account.owner}`; }
}
class TransferCommand extends Command {
  constructor(from, to, amount){ super(); this.from=from; this.to=to; this.amount=amount; }
  execute(){ this.from.withdraw(this.amount); this.to.deposit(this.amount); }
  undo(){ this.to.withdraw(this.amount); this.from.deposit(this.amount); }
  toString(){ return `Transfer ${this.amount} ${this.from.owner} -> ${this.to.owner}`; }
}

class CommandManager {
  constructor(){ this.history=[]; }
  execute(cmd){
    try { cmd.execute(); this.history.push(cmd); UI.logCommand(cmd.toString()); }
    catch(e){ notificationCenter.notify(`Command failed: ${e.message}`); }
  }
  undo(){
    const cmd = this.history.pop();
    if(!cmd){ notificationCenter.notify('Nothing to undo'); return; }
    try { cmd.undo(); UI.logCommand('UNDO: ' + cmd.toString()); }
    catch(e){ notificationCenter.notify(`Undo failed: ${e.message}`); }
  }
}

// -------------------------
// UI wiring
// -------------------------
const notificationCenter = new NotificationCenter();
const commandManager = new CommandManager();
const Bank = { accounts: [], nextId: 1 };

const UI = {
  renderAccounts(){
    const el = document.getElementById('accounts-list');
    el.innerHTML='';
    Bank.accounts.forEach(acc=>{
      const div=document.createElement('div'); div.className='account';
      div.innerHTML=`<div><strong>${acc.owner}</strong> <small class="muted">(${acc.type})</small></div>
        <div>₹${acc.balance.toFixed(2)} <span class="badge">${acc.id}</span></div>`;
      el.appendChild(div);
    });
    // update selects
    ['op-account','from-account','to-account'].forEach(id=>{
      const s=document.getElementById(id); s.innerHTML='';
      Bank.accounts.forEach(acc=>{
        const opt=document.createElement('option');
        opt.value=acc.id; opt.text=`${acc.owner} (₹${acc.balance.toFixed(2)})`;
        s.appendChild(opt);
      });
    });
  },
  renderNotifications(messages){
    const el=document.getElementById('notifications'); el.innerHTML='';
    messages.forEach(m=>{
      const d=document.createElement('div'); d.className='notification';
      d.innerHTML=`<div>${m.msg}</div><small class="muted">${m.time.toLocaleString()}</small>`;
      el.appendChild(d);
    });
  },
  logCommand(text){
    const el=document.getElementById('log');
    const d=document.createElement('div'); d.className='log-item';
    d.textContent=`${new Date().toLocaleTimeString()} — ${text}`;
    el.prepend(d);
  },
  init(){
    // seed sample accounts
    const a1=new Account(Bank.nextId++,'Alice','savings',1200);
    const a2=new Account(Bank.nextId++,'Bob','current',500);
    const a3=new Account(Bank.nextId++,'Corp Ltd','fixed',10000);
    [a1,a2,a3].forEach(acc=>acc.attach(notificationCenter));
    Bank.accounts.push(a1,a2,a3);
    this.renderAccounts();

    document.getElementById('create-account').addEventListener('click',()=>{
      const name=document.getElementById('new-name').value.trim();
      const type=document.getElementById('new-type').value;
      if(!name) return notificationCenter.notify('Provide a name');
      const acc=new Account(Bank.nextId++,name,type,0);
      acc.attach(notificationCenter); Bank.accounts.push(acc);
      this.renderAccounts();
      notificationCenter.notify(`Account created: ${name} (${type})`);
      document.getElementById('new-name').value='';
    });

    document.getElementById('deposit').addEventListener('click',()=>{
      const id=+document.getElementById('op-account').value;
      const amt=+document.getElementById('amount').value;
      const acc=Bank.accounts.find(a=>a.id===id);
      if(!acc||!amt) return notificationCenter.notify('Select account and amount');
      const cmd=new DepositCommand(acc,amt); commandManager.execute(cmd);
      this.renderAccounts();
    });

    document.getElementById('withdraw').addEventListener('click',()=>{
      const id=+document.getElementById('op-account').value;
      const amt=+document.getElementById('amount').value;
      const acc=Bank.accounts.find(a=>a.id===id);
      if(!acc||!amt) return notificationCenter.notify('Select account and amount');
      const cmd=new WithdrawCommand(acc,amt); commandManager.execute(cmd);
      this.renderAccounts();
    });

    document.getElementById('transfer').addEventListener('click',()=>{
      const fromId=+document.getElementById('from-account').value;
      const toId=+document.getElementById('to-account').value;
      const amt=+document.getElementById('transfer-amount').value;
      if(fromId===toId) return notificationCenter.notify('Select two different accounts');
      const from=Bank.accounts.find(a=>a.id===fromId);
      const to=Bank.accounts.find(a=>a.id===toId);
      const cmd=new TransferCommand(from,to,amt); commandManager.execute(cmd);
      this.renderAccounts();
    });

    document.getElementById('apply-interest').addEventListener('click',()=>{
      Bank.accounts.forEach(acc=>acc.applyInterest());
      this.renderAccounts();
    });

    document.getElementById('undo').addEventListener('click',()=>{
      commandManager.undo(); this.renderAccounts();
    });
  }
};

window.addEventListener('DOMContentLoaded',()=>{ UI.init(); });

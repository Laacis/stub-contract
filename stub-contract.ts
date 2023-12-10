export interface StubMintItem {
    amount: number;
    dataUri: string;
    dataHash: string;
  }
  
  export interface StubWdRequest {
    from: string;
    amount: number;
    approvedByAdmin: number;
    isProcessedByAdmin: boolean;
    approvedByOwner: number;
    isProcessedByOwner: boolean;
  }
  
  export interface StubUnholdRequest {
    enyzUnholdId: string;
    isProcessed: boolean;
    amount: number;
    approved: number;
  }
  
  export class StubContract {
    private readonly contractAddr: string;
    private readonly ownerAddr: string;
    private readonly tokenSymbol: string;
    private readonly tokenName: string;
    private readonly tokenDecimals: number;
    private admins: string[];
    private totalSupply: number;
    private readonly balances: { [addr: string]: number } = {};
    private readonly mintItems: StubMintItem[] = [];
    private readonly wdRequests: StubWdRequest[] = [];
    private readonly unholdRequests: StubUnholdRequest[] = [];
  
    constructor(
      contractAddr: string,
      callerPrivateKey: string,
      tokenName: string,
      tokenSymbol: string,
      tokenDecimals: number,
      adminsAddrs: string[],
    ) {
      this.contractAddr = contractAddr;
      this.ownerAddr = callerPrivateKey;
      this.admins = [...adminsAddrs];
      this.totalSupply = 0;
      this.tokenName = tokenName;
      this.tokenSymbol = tokenSymbol;
      this.tokenDecimals = tokenDecimals;
    }
  
    addAdmins(callerPrivateKey: string, adminsAddr: string[]): void {
      this.checkOnlyOwner(callerPrivateKey);
      if (adminsAddr.length == 0) {
        throw new Error('addAdmin: address was not provided');
      }
      adminsAddr.forEach((addr) => {
        if (this.admins.includes(addr)) {
          throw new Error(`addAdmin: ${addr}, already registered`);
        }
      });
      this.admins.push(...adminsAddr);
    }
  
    removeAdmins(callerPrivateKey: string, adminsAddr: string[]): void {
      this.checkOnlyOwner(callerPrivateKey);
      if (adminsAddr.length == 0) {
        throw new Error('removeAdmin: address was not provided');
      }
      adminsAddr.forEach((addr) => {
        if (!this.admins.includes(addr)) {
          throw new Error(`removeAdmin: ${addr}, is not registered as admin`);
        }
      });
      this.admins = this.admins.filter((a) => !adminsAddr.includes(a));
    }
  
    getAdmins(): string[] {
      return this.cloneByJson(this.admins);
    }
  
    mint(callerPrivateKey: string, mintObj: StubMintItem): void {
      this.checkOnlyOwner(callerPrivateKey);
      if (mintObj.amount <= 0) {
        throw new Error('Mint amount must be greater than 0');
      }
      if (mintObj.dataUri === undefined || mintObj.dataUri === '') {
        throw new Error('Mint dataUri must be provided');
      }
      if (mintObj.dataHash === undefined || mintObj.dataHash === '') {
        throw new Error('Mint dataHash must be provided');
      }
      this.mintItems.push(this.cloneByJson(mintObj));
      this.changeBalance(this.contractAddr, mintObj.amount);
    }
  
    getMintItem(ind: number): StubMintItem {
      const mint = this.mintItems[ind];
      if (mint === undefined) {
        throw new Error(`Mint item ${ind} not found`);
      }
      return this.cloneByJson(mint);
    }
  
    getMintCountItems(): number {
      return this.mintItems.length;
    }
  
    addUnholdRequest(
      callerPrivateKey: string,
      enyzUnholdId: string,
      amount: number,
    ): void {
      this.checkOnlyAdmin(callerPrivateKey);
      if (amount <= 0) {
        throw new Error('ENYZUnhold: amount must be greater than 0');
      }
      const contractBalance = this.getBalanceByAddr(this.contractAddr);
      if (contractBalance < amount) {
        throw new Error('ENYZUnhold: not enough tokens');
      }
  
      this.changeBalance(this.contractAddr, -amount);
  
      this.unholdRequests.push({
        enyzUnholdId: enyzUnholdId,
        isProcessed: false,
        amount: amount,
        approved: 0,
      });
    }
  
    approveUnhold(callerPrivateKey: string, ind: number, amount: number): void {
      this.checkOnlyOwner(callerPrivateKey);
      const unhold = this.unholdRequests[ind];
  
      if (unhold === undefined) {
        throw new Error('ENYZUnhold: request not found');
      }
      if (unhold.isProcessed) {
        throw new Error('ENYZUnhold: request already processed');
      }
      if (unhold.amount < amount) {
        throw new Error(
          'ENYZUnhold: amount must be less or equal than request amount',
        );
      }
  
      const reqAmount = this.unholdRequests[ind].amount;
      if (amount < reqAmount) {
        this.changeBalance(this.contractAddr, reqAmount - amount);
      }
  
      unhold.isProcessed = true;
      unhold.approved = amount;
    }
  
    getUnholdRequest(ind: number): StubUnholdRequest {
      const unholdRequest = this.unholdRequests[ind];
      if (unholdRequest === undefined) {
        throw new Error(`Unhold id ${ind} not found`);
      }
      return this.cloneByJson(unholdRequest);
    }
  
    getUnholdRequestCount(): number {
      return this.unholdRequests.length;
    }
  
    transfer(callerPrivateKey: string, to: string, amount: number) {
      if (this.admins.includes(to)) {
        throw new Error('Transfer: admin may not be receiver');
      }
      if (this.ownerAddr === to) {
        throw new Error('Transfer: owner may not be receiver');
      }
  
      if (!this.admins.includes(callerPrivateKey)) {
        if (to === this.contractAddr) {
          this.addWdRequest(callerPrivateKey, amount);
          return;
        }
  
        this.internalTransfer(callerPrivateKey, to, amount);
        return;
      }
  
      if (this.contractAddr == to) {
        throw new Error('Transfer: contractAddress may not be receiver');
      }
      this.internalTransfer(this.contractAddr, to, amount);
    }
  
    approveWdReqByAdmin(
      callerPrivateKey: string,
      ind: number,
      amount: number,
    ): void {
      this.checkOnlyAdmin(callerPrivateKey);
  
      const wdReq = this.wdRequests[ind];
      if (wdReq === undefined) {
        throw new Error('ENYZWithdrawal: Wd req not found');
      }
      if (wdReq.isProcessedByAdmin === true) {
        throw new Error(`ENYZWithdrawal: Wd req already approved by admin`);
      }
      if (amount > wdReq.amount)
        throw new Error(
          'ENYZWithdrawal: amount must be less or equal than request amount',
        );
  
      if (amount < wdReq.amount) {
        this.changeBalance(wdReq.from, wdReq.amount - amount);
      }
  
      wdReq.isProcessedByAdmin = true;
      wdReq.approvedByAdmin = amount;
    }
  
    approveWdReqByOwner(
      callerPrivateKey: string,
      ind: number,
      amount: number,
    ): void {
      this.checkOnlyOwner(callerPrivateKey);
  
      const wdReq = this.wdRequests[ind];
      if (wdReq === undefined) {
        throw new Error('ENYZWithdrawal: wd request not found');
      }
      if (wdReq.isProcessedByAdmin !== true) {
        throw new Error(
          'ENYZWithdrawal: request must be processed by admin before',
        );
      }
      if (wdReq.isProcessedByOwner === true) {
        throw new Error(`ENYZWithdrawal: request already processed by owner`);
      }
      if (amount > wdReq.approvedByAdmin)
        throw new Error(
          'ENYZWithdrawal: amount must be less or equal than approved amount by admin',
        );
  
      if (amount < wdReq.approvedByAdmin) {
        this.changeBalance(wdReq.from, wdReq.approvedByAdmin - amount);
      }
  
      wdReq.approvedByOwner = amount;
      wdReq.isProcessedByOwner = true;
    }
  
    getWdRequestCount(): number {
      return this.wdRequests.length;
    }
  
    getWdRequest(ind: number): StubWdRequest {
      const wdRequest = this.wdRequests[ind];
      if (wdRequest === undefined) {
        throw new Error(`Wd request ${ind} not found`);
      }
      return this.cloneByJson(wdRequest);
    }
  
    getTotalSupply(): string {
      return this.totalSupply.toString();
    }
  
    getBalanceByAddr(addr: string): number {
      const balance = this.balances[addr];
      return balance ?? 0;
    }
  
    private addWdRequest(from: string, amount: number): void {
      const ind = this.getWdRequestCount();
      const balance = this.getBalanceByAddr(from);
      if (balance === 0) {
        throw new Error('ENYZWithdrawal: wallet can not be empty');
      }
      if (amount > balance) {
        throw new Error('ENYZWithdrawal: not enough tokens');
      }
      if (amount <= 0) {
        throw new Error('ENYZWithdrawal: amount must be greater than 0');
      }
  
      this.changeBalance(from, -amount);
  
      this.wdRequests[ind] = {
        from: from,
        amount: amount,
        approvedByAdmin: 0,
        isProcessedByAdmin: false,
        approvedByOwner: 0,
        isProcessedByOwner: false,
      };
    }
  
    private internalTransfer(from: string, to: string, amount: number): void {
      if (this.getBalanceByAddr(from) < amount) {
        throw new Error('Transfer amount exceeds balance');
      }
      this.changeBalance(from, -amount);
      this.changeBalance(to, amount);
    }
  
    private checkOnlyOwner(callerPrivateKey: string) {
      if (!(callerPrivateKey === this.ownerAddr)) {
        throw new Error('Only owner can call this method');
      }
    }
  
    private checkOnlyAdmin(callerPrivateKey: string) {
      if (!this.admins.includes(callerPrivateKey)) {
        throw new Error('Only admin can call this method');
      }
    }
  
    private cloneByJson<T>(obj: T): T {
      return JSON.parse(JSON.stringify(obj));
    }
  
    private changeBalance(addr: string, amount: number): void {
      if (this.balances[addr] === undefined) {
        this.balances[addr] = 0;
      }
      this.balances[addr] += amount;
      this.totalSupply += amount;
    }
  }
  
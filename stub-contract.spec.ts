import { Logger } from '@nestjs/common';
import { StubContract } from './stub-contract';

describe('stub contract', () => {
  jest.setTimeout(600000);
  const [owner, admin1, admin2, user1, user2] = [
    '0x01',
    '0x02',
    '0x03',
    '0x04',
    '0x05',
  ];
  const scAddr = '0x06';
  const logger = new Logger();
  let sc: StubContract;

  beforeEach(async () => {
    sc = new StubContract(scAddr, owner, 'test token', 'TTT', 18, [
      admin1,
      admin2,
    ]);
  });

  function createMint(amount: number) {
    sc.mint(owner, {
      amount: amount,
      dataUri: 'http://ddd.com/ddd2',
      dataHash: '010203040',
    });
    logger.log('mint was created');
  }
  function mintAndTransferToUser(mintAmount: number, to: string) {
    createMint(mintAmount);
    sc.transfer(admin1, to, mintAmount);
    logger.log('admin transferred minted amount to user');
  }

  describe('balance and total supply', () => {
    const userTrMint = 1000;
    it('total supply', () => {
      expect(sc.getTotalSupply()).toBe('0');
    });

    it('get balance by address', () => {
      expect(sc.getTotalSupply()).toEqual('0');
      createMint(userTrMint);
      expect(sc.getTotalSupply()).toEqual(userTrMint.toString());
      logger.log(`scAddr balance: ${sc.getBalanceByAddr(scAddr)}`);
      expect(sc.getBalanceByAddr(scAddr)).toEqual(userTrMint);
      expect(sc.getBalanceByAddr(user1)).toEqual(0);
    });
  });

  describe('admins', () => {
    it('add admins', () => {
      sc.addAdmins(owner, ['55555']);
      logger.log('admins added');
      expect(sc.getAdmins()).toContain('55555');
    });

    it('fail add admins, caller is not owner', () => {
      expect(() => sc.addAdmins(admin2, ['55555'])).toThrowError(
        'Only owner can call this method',
      );
    });

    it('fail add admins, no address provided', () => {
      expect(() => sc.addAdmins(owner, [])).toThrowError(
        'addAdmin: address was not provided',
      );
    });

    it('fail add admins, admin already register', () => {
      expect(() => sc.addAdmins(owner, [admin1, '55555'])).toThrowError(
        `addAdmin: ${admin1}, already registered`,
      );
    });

    it('remove admins', () => {
      sc.removeAdmins(owner, [admin1, admin2]);
      logger.log('admins removed');
      expect(sc.getAdmins()).toEqual([]);
    });

    it('fail remove admins', () => {
      expect(() => sc.removeAdmins(admin1, [user2, admin2])).toThrowError(
        'Only owner can call this method',
      );
    });
    it('fail remove admins, no address provided', () => {
      expect(() => sc.removeAdmins(owner, [])).toThrowError(
        'removeAdmin: address was not provided',
      );
    });
    it('fail remove admins, address not admin', () => {
      expect(() => sc.removeAdmins(owner, [user1, '55555'])).toThrowError(
        `removeAdmin: ${user1}, is not registered as admin`,
      );
    });
  });

  describe('mint', () => {
    it('create mint', () => {
      const amount = 100;
      expect(sc.getTotalSupply()).toEqual('0');
      createMint(amount);
      expect(sc.getTotalSupply()).toBe(amount.toString());
    });

    it('fail create mint ', () => {
      expect(() =>
        sc.mint(admin1, {
          amount: 100,
          dataUri: 'http://ddd.dd',
          dataHash: '010203040',
        }),
      ).toThrowError('Only owner can call this method');
      expect(() =>
        sc.mint(owner, {
          amount: 100,
          dataUri: '',
          dataHash: '010203040',
        }),
      ).toThrowError('Mint dataUri must be provided');
      expect(() =>
        sc.mint(owner, {
          amount: 0,
          dataUri: 'http://ddd.dd',
          dataHash: '010203040',
        }),
      ).toThrowError('Mint amount must be greater than 0');
      expect(() =>
        sc.mint(owner, {
          amount: 100,
          dataUri: 'http://dddd.dd',
          dataHash: '',
        }),
      ).toThrowError('Mint dataHash must be provided');
    });

    it('getMintItem', () => {
      const ind = 0;
      const mintAmount = 1000;
      expect(sc.getTotalSupply()).toEqual('0');
      createMint(mintAmount);
      expect(sc.getTotalSupply()).toEqual(mintAmount.toString());
      logger.log(sc.getMintItem(ind));
      expect(sc.getMintItem(ind)).toEqual({
        amount: mintAmount,
        dataUri: 'http://ddd.com/ddd2',
        dataHash: '010203040',
      });
    });

    it('fail getMintItem', () => {
      const ind = 0;

      expect(() => sc.getMintItem(ind)).toThrowError(
        `Mint item ${ind} not found`,
      );
    });

    it('getMintItem count', () => {
      expect(sc.getTotalSupply()).toEqual('0');
      const mintAmount = 1000;
      expect(sc.getMintCountItems()).toEqual(0);
      createMint(mintAmount);
      expect(sc.getTotalSupply()).toEqual(mintAmount.toString());
      logger.log(sc.getMintCountItems());
      expect(sc.getMintCountItems()).toEqual(1);
    });
  });

  describe('unhold', () => {
    const enyzUnhString = 'enyzUnholdIdString12345';
    const mintAmount = 100;
    const unholdAmount = 50;
    const unholdApproveAmount = 40;
    it('create unhold request', () => {
      createMint(mintAmount);
      expect(sc.getTotalSupply()).toEqual(mintAmount.toString());
      sc.addUnholdRequest(admin2, enyzUnhString, unholdAmount);
      expect(sc.getTotalSupply()).toEqual(
        (mintAmount - unholdAmount).toString(),
      );
      logger.log(`unhold was created`);
      expect(sc.getTotalSupply()).toEqual(
        (mintAmount - unholdAmount).toString(),
      );
    });
    it('fail create unhold request', () => {
      expect(() =>
        sc.addUnholdRequest(admin1, enyzUnhString, unholdAmount),
      ).toThrowError('ENYZUnhold: not enough tokens');

      createMint(mintAmount);

      expect(() =>
        sc.addUnholdRequest(owner, enyzUnhString, unholdAmount),
      ).toThrowError('Only admin can call this method');
      expect(() =>
        sc.addUnholdRequest(admin2, enyzUnhString, -unholdAmount),
      ).toThrowError('ENYZUnhold: amount must be greater than 0');
    });
    it('get unhold request', () => {
      createMint(mintAmount);
      expect(sc.getTotalSupply()).toEqual(mintAmount.toString());
      sc.addUnholdRequest(admin2, enyzUnhString, unholdAmount);
      expect(sc.getTotalSupply()).toEqual(
        (mintAmount - unholdAmount).toString(),
      );
      logger.log(`unhold was created`);
      logger.log(sc.getUnholdRequest(0));
      expect(sc.getUnholdRequest(0)).toEqual({
        enyzUnholdId: enyzUnhString,
        isProcessed: false,
        amount: unholdAmount,
        approved: 0,
      });
    });
    it('fail to get unhold request', () => {
      const ind = 0;

      expect(() => sc.getUnholdRequest(ind)).toThrowError(
        `Unhold id ${ind} not found`,
      );
    });
    it('get unhold requests count', () => {
      expect(sc.getUnholdRequestCount()).toEqual(0);
      expect(sc.getTotalSupply()).toEqual('0');
      createMint(mintAmount);
      expect(sc.getTotalSupply()).toEqual(mintAmount.toString());
      sc.addUnholdRequest(admin2, enyzUnhString, unholdAmount);
      expect(sc.getTotalSupply()).toEqual(
        (mintAmount - unholdAmount).toString(),
      );
      logger.log(`unhold was created`);
      logger.log(sc.getUnholdRequestCount());
      expect(sc.getUnholdRequestCount()).toEqual(1);
    });
    it('approve unhold', () => {
      expect(sc.getTotalSupply()).toEqual('0');
      createMint(mintAmount);
      expect(sc.getTotalSupply()).toEqual(mintAmount.toString());
      sc.addUnholdRequest(admin2, enyzUnhString, unholdAmount);
      expect(sc.getTotalSupply()).toEqual(
        (mintAmount - unholdAmount).toString(),
      );
      logger.log(`unhold was created`);
      sc.approveUnhold(owner, 0, unholdApproveAmount);
      logger.log(`unhold was approved`);
      const approvedUnhold = sc.getUnholdRequest(0);
      logger.log(approvedUnhold);
      const expectedTotalSupply = mintAmount - unholdApproveAmount;
      expect(sc.getTotalSupply()).toEqual(expectedTotalSupply.toString());
      expect(approvedUnhold.isProcessed).toEqual(true);
      expect(approvedUnhold.approved).toEqual(unholdApproveAmount);
    });
    it('fail approve unhold ', () => {
      expect(sc.getTotalSupply()).toEqual('0');
      createMint(mintAmount);
      expect(sc.getTotalSupply()).toEqual(mintAmount.toString());
      sc.addUnholdRequest(admin2, enyzUnhString, unholdAmount);
      expect(sc.getTotalSupply()).toEqual(
        (mintAmount - unholdAmount).toString(),
      );
      logger.log(`unhold was created`);
      expect(() =>
        sc.approveUnhold(admin2, 0, unholdApproveAmount),
      ).toThrowError('Only owner can call this method');
      expect(() =>
        sc.approveUnhold(owner, 1, unholdApproveAmount),
      ).toThrowError('ENYZUnhold: request not found');
      expect(() => sc.approveUnhold(owner, 0, mintAmount)).toThrowError(
        'ENYZUnhold: amount must be less or equal than request amount',
      );
      sc.approveUnhold(owner, 0, unholdApproveAmount);
      expect(() =>
        sc.approveUnhold(owner, 0, unholdApproveAmount),
      ).toThrowError('ENYZUnhold: request already processed');
    });
  });

  describe('transfer', () => {
    const userTrMint = 1000;
    const userTrAmount = 100;

    it('admin transfer', () => {
      expect(sc.getTotalSupply()).toEqual('0');
      mintAndTransferToUser(userTrMint, user1);
      expect(sc.getTotalSupply()).toEqual(userTrMint.toString());
      logger.log(`user1 balance: ${sc.getBalanceByAddr(user1)}`);
      expect(sc.getBalanceByAddr(user1)).toEqual(userTrMint);
      expect(sc.getBalanceByAddr(scAddr)).toEqual(0);
    });

    it('fail admin transfer', () => {
      expect(sc.getTotalSupply()).toEqual('0');
      createMint(userTrMint);
      expect(sc.getTotalSupply()).toEqual(userTrMint.toString());

      expect(() => sc.transfer(admin1, admin2, userTrMint)).toThrowError(
        'Transfer: admin may not be receiver',
      );
      expect(() => sc.transfer(admin1, scAddr, userTrMint)).toThrowError(
        'Transfer: contractAddress may not be receiver',
      );
      expect(() => sc.transfer(admin1, user1, userTrMint + 100)).toThrowError(
        'Transfer amount exceeds balance',
      );
    });

    it('transfer user to user', () => {
      expect(sc.getTotalSupply()).toEqual('0');
      mintAndTransferToUser(userTrMint, user1);
      expect(sc.getTotalSupply()).toEqual(userTrMint.toString());
      sc.transfer(user1, user2, userTrAmount);
      logger.log('user to user tx executed');
      logger.log(`user1 balance: ${sc.getBalanceByAddr(user1)}`);
      logger.log(`user2 balance: ${sc.getBalanceByAddr(user2)}`);
      expect(sc.getBalanceByAddr(user1)).toEqual(userTrMint - userTrAmount);
      expect(sc.getBalanceByAddr(user2)).toEqual(userTrAmount);
      expect(sc.getTotalSupply()).toEqual(userTrMint.toString());
    });

    it('fail user transfer', () => {
      expect(sc.getTotalSupply()).toEqual('0');
      mintAndTransferToUser(userTrMint, user1);
      expect(sc.getTotalSupply()).toEqual(userTrMint.toString());

      expect(() => sc.transfer(user1, admin2, userTrMint)).toThrowError(
        'Transfer: admin may not be receiver',
      );
      expect(() => sc.transfer(user1, user2, userTrMint + 100)).toThrowError(
        'Transfer amount exceeds balance',
      );
      expect(() => sc.transfer(user1, owner, userTrAmount)).toThrowError(
        'Transfer: owner may not be receiver',
      );
    });
  });

  describe('withdrawal', () => {
    const wdMintAmount = 1000;
    const wdUserTrAmount = 800;
    const wdAmount = 700;
    const wdAdminAmount = 600;
    const wdOwnerAmount = 500;

    it('get wd request count', () => {
      mintAndTransferToUser(wdMintAmount, user1);
      expect(sc.getTotalSupply()).toEqual(wdMintAmount.toString());
      sc.transfer(user1, scAddr, wdAmount);
      expect(sc.getTotalSupply()).toEqual((wdMintAmount - wdAmount).toString());
      logger.log('wd request was created');
      logger.log(sc.getWdRequestCount());
      expect(sc.getWdRequestCount()).toEqual(1);
    });

    it('get wd request', () => {
      mintAndTransferToUser(wdMintAmount, user1);
      expect(sc.getTotalSupply()).toEqual(wdMintAmount.toString());
      sc.transfer(user1, scAddr, wdAmount);
      logger.log('wd request was created');
      expect(sc.getTotalSupply()).toEqual((wdMintAmount - wdAmount).toString());
      logger.log(sc.getWdRequest(0));
      expect(sc.getWdRequest(0)).toEqual({
        from: user1,
        amount: wdAmount,
        approvedByAdmin: 0,
        isProcessedByAdmin: false,
        approvedByOwner: 0,
        isProcessedByOwner: false,
      });
    });

    it('fail to get wd request', () => {
      let ind = 0;

      expect(() => sc.getWdRequest(ind)).toThrowError(
        `Wd request ${ind} not found`,
      );

      mintAndTransferToUser(wdMintAmount, user1);
      expect(sc.getTotalSupply()).toEqual(wdMintAmount.toString());
      sc.transfer(user1, scAddr, wdAmount);
      expect(sc.getTotalSupply()).toEqual((wdMintAmount - wdAmount).toString());
      logger.log('wd request was created');
      ind++;
      expect(() => sc.getWdRequest(ind)).toThrowError(
        `Wd request ${ind} not found`,
      );
    });

    it('create wd request', () => {
      mintAndTransferToUser(wdMintAmount, user1);
      expect(sc.getTotalSupply()).toEqual(wdMintAmount.toString());
      sc.transfer(user1, user2, wdUserTrAmount);
      expect(sc.getTotalSupply()).toEqual(wdMintAmount.toString());
      sc.transfer(user2, scAddr, wdAmount);
      logger.log('wd request was created');
      logger.log(sc.getWdRequestCount());
      expect(sc.getWdRequestCount()).toEqual(1);
      expect(sc.getWdRequest(0)).toEqual({
        from: user2,
        amount: wdAmount,
        approvedByAdmin: 0,
        isProcessedByAdmin: false,
        approvedByOwner: 0,
        isProcessedByOwner: false,
      });
      const expectedTotalSupply = wdMintAmount - wdAmount;
      expect(sc.getTotalSupply()).toEqual(expectedTotalSupply.toString());
    });

    it('fail to create wd request', () => {
      mintAndTransferToUser(wdMintAmount, user1);

      expect(() => sc.transfer(user2, scAddr, wdMintAmount)).toThrowError(
        'ENYZWithdrawal: wallet can not be empty',
      );
      sc.transfer(user1, user2, wdUserTrAmount);
      expect(() => sc.transfer(user2, scAddr, wdMintAmount)).toThrowError(
        'ENYZWithdrawal: not enough tokens',
      );
      expect(() => sc.transfer(user2, scAddr, 0)).toThrowError(
        'ENYZWithdrawal: amount must be greater than 0',
      );
    });

    it('approve wd by admin', () => {
      mintAndTransferToUser(wdMintAmount, user1);
      expect(sc.getTotalSupply()).toEqual(wdMintAmount.toString());
      sc.transfer(user1, scAddr, wdAmount);
      logger.log('wd request was created');
      expect(sc.getTotalSupply()).toEqual((wdMintAmount - wdAmount).toString());
      expect(sc.getWdRequest(0).isProcessedByAdmin).toEqual(false);

      sc.approveWdReqByAdmin(admin2, 0, wdAdminAmount);

      expect(sc.getWdRequest(0).isProcessedByAdmin).toEqual(true);
      expect(sc.getBalanceByAddr(user1)).toEqual(wdMintAmount - wdAdminAmount);

      const expectedTotalSupply = wdMintAmount - wdAdminAmount;
      expect(sc.getTotalSupply()).toEqual(expectedTotalSupply.toString());
    });

    it('fail to approve wd by admin', () => {
      mintAndTransferToUser(wdMintAmount, user1);
      expect(sc.getTotalSupply()).toEqual(wdMintAmount.toString());
      sc.transfer(user1, scAddr, wdAmount);
      logger.log('wd request was created');
      expect(sc.getWdRequest(0).isProcessedByAdmin).toEqual(false);

      expect(() =>
        sc.approveWdReqByAdmin(owner, 0, wdAdminAmount),
      ).toThrowError('Only admin can call this method');
      expect(() =>
        sc.approveWdReqByAdmin(admin2, 1, wdAdminAmount),
      ).toThrowError('ENYZWithdrawal: Wd req not found');
      expect(() =>
        sc.approveWdReqByAdmin(admin2, 0, wdAmount + 1),
      ).toThrowError(
        'ENYZWithdrawal: amount must be less or equal than request amount',
      );

      sc.approveWdReqByAdmin(admin2, 0, wdAdminAmount);

      expect(() =>
        sc.approveWdReqByAdmin(admin2, 0, wdAdminAmount),
      ).toThrowError('ENYZWithdrawal: Wd req already approved by admin');
    });

    it('approve wd by owner', () => {
      mintAndTransferToUser(wdMintAmount, user1);
      expect(sc.getTotalSupply()).toEqual(wdMintAmount.toString());
      sc.transfer(user1, scAddr, wdAmount);
      logger.log('wd request was created');
      expect(sc.getTotalSupply()).toEqual((wdMintAmount - wdAmount).toString());
      sc.approveWdReqByAdmin(admin2, 0, wdAdminAmount);
      expect(sc.getTotalSupply()).toEqual(
        (wdMintAmount - wdAdminAmount).toString(),
      );
      logger.log('admin approved wd request');
      expect(sc.getWdRequest(0).isProcessedByOwner).toEqual(false);
      sc.approveWdReqByOwner(owner, 0, wdOwnerAmount);
      logger.log('owner approved wd request');

      logger.log(sc.getWdRequest(0));
      expect(sc.getWdRequest(0).isProcessedByOwner).toEqual(true);
      expect(sc.getBalanceByAddr(user1)).toEqual(wdMintAmount - wdOwnerAmount);

      const expectedTotalSupply = wdMintAmount - wdOwnerAmount;
      expect(sc.getTotalSupply()).toEqual(expectedTotalSupply.toString());
    });

    it('fail to approve wd by owner', () => {
      mintAndTransferToUser(wdMintAmount, user1);
      expect(sc.getTotalSupply()).toEqual(wdMintAmount.toString());
      sc.transfer(user1, scAddr, wdAmount);
      expect(sc.getTotalSupply()).toEqual((wdMintAmount - wdAmount).toString());
      logger.log('wd request was created');
      expect(() =>
        sc.approveWdReqByOwner(owner, 0, wdAdminAmount),
      ).toThrowError(
        'ENYZWithdrawal: request must be processed by admin before',
      );

      sc.approveWdReqByAdmin(admin2, 0, wdAdminAmount);
      logger.log('admin approved wd request');
      expect(sc.getWdRequest(0).isProcessedByOwner).toEqual(false);

      expect(() =>
        sc.approveWdReqByOwner(admin1, 0, wdOwnerAmount),
      ).toThrowError('Only owner can call this method');
      expect(() =>
        sc.approveWdReqByOwner(owner, 1, wdAdminAmount),
      ).toThrowError('ENYZWithdrawal: wd request not found');
      expect(() =>
        sc.approveWdReqByOwner(owner, 0, wdAdminAmount + 1),
      ).toThrowError(
        'ENYZWithdrawal: amount must be less or equal than approved amount by admin',
      );

      sc.approveWdReqByOwner(owner, 0, wdOwnerAmount);

      expect(() =>
        sc.approveWdReqByOwner(owner, 0, wdAdminAmount),
      ).toThrowError('ENYZWithdrawal: request already processed by owner');
    });
  });
});

const stratos = artifacts.require('Stratos');
const BigNumber = require('bignumber.js');

contract('stratos', accounts => {
    const [admin, bob, ...rest] = accounts;

    const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000"
    const MINT_BURN_ROLE = "0xa60cb0df7bc178038b993aa2e0df2e2cfb6627f4695e4261227d47422ae7e2a6"

    const tokenAmountBase = 10 ** 18
    const mintAmount = new BigNumber(100 * tokenAmountBase).toFixed()
    const doubleMintAmount = new BigNumber(100 * tokenAmountBase).toFixed()
    const burnAmount = new BigNumber(90 * tokenAmountBase).toFixed()
    const leftOverAmount = new BigNumber(10 * tokenAmountBase).toFixed()
    const decreaseAllowanceAmount = new BigNumber(50 * tokenAmountBase).toFixed()
    const zeroBalance = 0

    const maxSupply = new BigNumber(1 * 10 ** 8 * tokenAmountBase);
    const maxTotalSupply = maxSupply.toFixed()

    let contract;

    beforeEach(async () => {
        contract = await stratos.new()
    });

    // general contract info and init status
    it('1. get name', async () => {
        const tokenName = await contract.name()
        assert.equal(tokenName, "Stratos Token")
    });

    it('2. get symbol', async () => {
        const tokenSymbol = await contract.symbol()
        assert.equal(tokenSymbol, "STOS")
    });

    it('3. get init stopped status', async () => {
        const pauseStatus1 = await contract.stopped()
        const pauseStatus2 = await contract.paused()
        assert.equal(pauseStatus1, pauseStatus2)
        assert.equal(pauseStatus2, false)
    });

    it('4. get total supply', async () => {
        const totalSupply = await contract.totalSupply()
        assert.equal(totalSupply, 0)
    });

    it('5. get decimal', async () => {
        const d = await contract.decimals()
        assert.equal(d, 18)
    });

    it('6. get owner', async () => {
        const owner = await contract.owner()
        assert.equal(owner, admin)
    });

    it('7. owner has admin role', async () => {
        const ok = await contract.hasRole(DEFAULT_ADMIN_ROLE, admin)
        assert.equal(ok, true)
    });

    it('8. owner has mint_burn role', async () => {
        const ok = await contract.hasRole(MINT_BURN_ROLE, admin)
        assert.equal(ok, true)
    });

    // ownership change
    it('9. change ownership from admin to bob', async () => {
        await contract.setOwner(bob, {from: admin})
        const newOwner = await contract.owner()
        assert.equal(newOwner, bob)

        // new owner has default admin and mint_burn roles
        const hasAdminRole = await contract.hasRole(DEFAULT_ADMIN_ROLE, bob)
        assert.equal(hasAdminRole, true)
        const hasMintBurnRole = await contract.hasRole(MINT_BURN_ROLE, bob)
        assert.equal(hasMintBurnRole, true)

        // old owner does not have default admin and mint_burn roles
        const hasAdminRole_old = await contract.hasRole(DEFAULT_ADMIN_ROLE, admin)
        assert.equal(hasAdminRole_old, false)
        const hasMintBurnRole_old = await contract.hasRole(MINT_BURN_ROLE, admin)
        assert.equal(hasMintBurnRole_old, false)
    });

    it('10. bob calls to change ownership to himself', async () => {
        await contract.setOwner(bob, {from: bob}).catch(err => {
            assert.equal(err.reason.toString(), "Ownable: caller is not the owner")
        })
        const newOwner = await contract.owner()
        assert.equal(newOwner, admin)
    });

    // ERC20 functions
    it('11. transfer: admin to bob', async () => {
        await contract.mint(admin, mintAmount, {from: admin})
        const adminBalanceBefore = await contract.balanceOf(admin)
        const bobBalanceBefore = await contract.balanceOf(bob)
        assert.equal(adminBalanceBefore, mintAmount)
        assert.equal(bobBalanceBefore, zeroBalance)

        await contract.transfer(bob, burnAmount, {from: admin})

        const adminBalanceAfter = await contract.balanceOf(admin)
        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(adminBalanceAfter, leftOverAmount)
        assert.equal(bobBalanceAfter, burnAmount)
    });

    it('12. transferForm: admin to bob', async () => {
        await contract.mint(admin, mintAmount, {from: admin})
        const adminBalanceBefore = await contract.balanceOf(admin)
        const bobBalanceBefore = await contract.balanceOf(bob)
        assert.equal(adminBalanceBefore, mintAmount)
        assert.equal(bobBalanceBefore, zeroBalance)

        // failed because of amount exceeding allowance
        await contract.transferFrom(admin, bob, burnAmount, {from: bob}).catch(err => {
            assert.equal(err.reason.toString(), "ERC20: insufficient allowance")
        })

        const adminBalanceAfter = await contract.balanceOf(admin)
        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(adminBalanceAfter, mintAmount)
        assert.equal(bobBalanceAfter, zeroBalance)

        await contract.approve(bob, burnAmount, {from: admin})

        await contract.transferFrom(admin, bob, burnAmount, {from: bob})

        const adminBalanceAfter2 = await contract.balanceOf(admin)
        const bobBalanceAfter2 = await contract.balanceOf(bob)
        assert.equal(adminBalanceAfter2, leftOverAmount)
        assert.equal(bobBalanceAfter2, burnAmount)
    });

    it('13. admin grants allowance to bob 100 STOS', async () => {
        await contract.mint(admin, mintAmount, {from: admin})
        const adminBalanceBefore = await contract.balanceOf(admin)
        const bobBalanceBefore = await contract.balanceOf(bob)
        assert.equal(adminBalanceBefore, mintAmount)
        assert.equal(bobBalanceBefore, zeroBalance)

        const aTOb_allowanceBefore = await contract.allowance(admin, bob)
        assert.equal(aTOb_allowanceBefore, zeroBalance)

        await contract.increaseAllowance(bob, mintAmount, {from: admin})

        const aTOb_allowanceAfter = await contract.allowance(admin, bob)
        assert.equal(aTOb_allowanceAfter, mintAmount)

        await contract.transferFrom(admin, bob, mintAmount, {from: bob})
        const bobBalance = await contract.balanceOf(bob)
        assert.equal(bobBalance, mintAmount)

        const aTOb_allowanceBefore2 = await contract.allowance(admin, bob)
        assert.equal(aTOb_allowanceBefore2, zeroBalance)

        const adminBalanceAfter = await contract.balanceOf(admin)
        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(adminBalanceAfter, zeroBalance)
        assert.equal(bobBalanceAfter, mintAmount)
    });

    it('14. admin decrease allowance to bob 50 STOS', async () => {
        const aTOb_allowanceBefore = await contract.allowance(admin, bob)
        assert.equal(aTOb_allowanceBefore, zeroBalance)

        await contract.increaseAllowance(bob, mintAmount, {from: admin})

        const aTOb_allowanceAfter = await contract.allowance(admin, bob)
        assert.equal(aTOb_allowanceAfter, mintAmount)

        await contract.decreaseAllowance(bob, decreaseAllowanceAmount, {from: admin})

        const aTOb_allowanceBefore2 = await contract.allowance(admin, bob)
        assert.equal(aTOb_allowanceBefore2, decreaseAllowanceAmount)
    });

    // mint & burn
    it('15. admin mints for bob 100 STOS', async () => {
        await contract.mint(bob, mintAmount, {from: admin})
        const bobBalance = await contract.balanceOf(bob)
        assert.equal(bobBalance, mintAmount)
    });

    it('16. bob mints for bob 100 STOS', async () => {
        await contract.mint(bob, mintAmount, {from: bob}).catch(err => {
            assert.equal(err.reason.toString(), "Caller is not allowed to mint")
        })
        const bobBalance = await contract.balanceOf(bob)
        assert.equal(bobBalance, zeroBalance)
    });

    it('17. admin burns from bob 100 STOS', async () => {
        await contract.mint(bob, mintAmount, {from: admin})
        const bobBalanceAfterMint = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfterMint, mintAmount)

        await contract.burn(bob, burnAmount, {from: admin})
        const bobBalanceAfterBurn = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfterBurn, leftOverAmount)
    });

    it('18. bob burns from bob 100 STOS', async () => {
        await contract.mint(bob, mintAmount, {from: admin})
        const bobBalanceAfterMint = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfterMint, mintAmount)

        await contract.burn(bob, burnAmount, {from: bob}).catch(err => {
            assert.equal(err.reason.toString(), "Caller is not allowed to burn")
        })
        const bobBalanceAfterBurn = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfterBurn, mintAmount)
    });

    it('19. mint after stop then resume', async () => {
        const pauseStatusBefore1 = await contract.stopped()
        const pauseStatusBefore2 = await contract.paused()
        assert.equal(pauseStatusBefore1, pauseStatusBefore2)
        assert.equal(pauseStatusBefore2, false)

        const bobBalanceBeforeStop = await contract.balanceOf(bob)
        assert.equal(bobBalanceBeforeStop, zeroBalance)

        await contract.stop()

        const pauseStatusAfter1 = await contract.stopped()
        const pauseStatusAfter2 = await contract.paused()
        assert.equal(pauseStatusAfter1, pauseStatusAfter2)
        assert.equal(pauseStatusAfter2, true)

        await contract.mint(bob, mintAmount, {from: admin}).catch(err => {
            assert.equal(err.reason.toString(), "Pausable: paused")
        })
        const bobBalanceAfterStop = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfterStop, zeroBalance)
    });

    // role grant & revoke
    it('20. grant mint_burn role then call mint with setAuthority', async () => {
        const bobBalanceBefore1 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore1, zeroBalance)

        await contract.mint(bob, mintAmount, {from: bob}).catch(err => {
            assert.equal(err.reason.toString(), "Caller is not allowed to mint")
        })

        const bobBalanceBefore2 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore2, zeroBalance)

        await contract.setAuthority(bob)

        const hasMintBurnRole = await contract.hasRole(MINT_BURN_ROLE, bob)
        assert.equal(hasMintBurnRole, true)

        await contract.mint(bob, mintAmount, {from: bob})

        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfter, mintAmount)
    });

    it('21. grant mint_burn role then call mint with grantMintBurnRole', async () => {
        const bobBalanceBefore1 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore1, zeroBalance)

        await contract.mint(bob, mintAmount, {from: bob}).catch(err => {
            assert.equal(err.reason.toString(), "Caller is not allowed to mint")
        })

        const bobBalanceBefore2 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore2, zeroBalance)

        await contract.grantMintBurnRole(bob)

        const hasMintBurnRole = await contract.hasRole(MINT_BURN_ROLE, bob)
        assert.equal(hasMintBurnRole, true)

        await contract.mint(bob, mintAmount, {from: bob})

        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfter, mintAmount)
    });

    it('22. grant mint_burn role then call burn with setAuthority', async () => {
        await contract.mint(bob, mintAmount, {from: admin})
        const bobBalanceBefore1 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore1, mintAmount)

        await contract.burn(bob, burnAmount, {from: bob}).catch(err => {
            assert.equal(err.reason.toString(), "Caller is not allowed to burn")
        })

        const bobBalanceBefore2 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore2, mintAmount)

        await contract.setAuthority(bob)

        const hasMintBurnRole = await contract.hasRole(MINT_BURN_ROLE, bob)
        assert.equal(hasMintBurnRole, true)

        await contract.burn(bob, burnAmount, {from: bob})

        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfter, leftOverAmount)
    });

    it('23. grant mint_burn role then call burn with grantMintBurnRole', async () => {
        await contract.mint(bob, mintAmount, {from: admin})
        const bobBalanceBefore1 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore1, mintAmount)

        await contract.burn(bob, burnAmount, {from: bob}).catch(err => {
            assert.equal(err.reason.toString(), "Caller is not allowed to burn")
        })

        const bobBalanceBefore2 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore2, mintAmount)

        await contract.grantMintBurnRole(bob)

        const hasMintBurnRole = await contract.hasRole(MINT_BURN_ROLE, bob)
        assert.equal(hasMintBurnRole, true)

        await contract.burn(bob, burnAmount, {from: bob})

        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfter, leftOverAmount)
    });

    it('24. revoke mint_burn role then call mint', async () => {
        await contract.mint(bob, mintAmount, {from: admin})
        const bobBalanceBefore1 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore1, mintAmount)

        await contract.revokeMintBurnRole(admin)

        const hasMintBurnRole = await contract.hasRole(MINT_BURN_ROLE, admin)
        assert.equal(hasMintBurnRole, false)

        await contract.mint(bob, mintAmount, {from: admin}).catch(err => {
            assert.equal(err.reason.toString(), "Caller is not allowed to mint")
        })

        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfter, mintAmount)
    });

    it('25. revoke mint_burn role then call burn', async () => {
        await contract.mint(bob, mintAmount, {from: admin})
        const bobBalanceBefore1 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore1, mintAmount)

        await contract.burn(bob, burnAmount, {from: admin})
        const bobBalanceBefore2 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore2, leftOverAmount)

        await contract.revokeMintBurnRole(admin)

        const hasMintBurnRole = await contract.hasRole(MINT_BURN_ROLE, admin)
        assert.equal(hasMintBurnRole, false)

        await contract.burn(bob, leftOverAmount, {from: admin}).catch(err => {
            assert.equal(err.reason.toString(), "Caller is not allowed to burn")
        })

        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfter, leftOverAmount)
    });

    // max supply limitation
    it('26. max supply limitation', async () => {
        const initTotalSupply = await contract.totalSupply()
        assert.equal(initTotalSupply, 0)

        await contract.mint(admin, maxTotalSupply, {from: admin})
        const adminBalanceBefore1 = await contract.balanceOf(admin)
        assert.equal(adminBalanceBefore1, maxTotalSupply)

        const bobBalanceBefore1 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBefore1, zeroBalance)

        const totalSupply1 = await contract.totalSupply()
        assert.equal(totalSupply1, maxTotalSupply)

        await contract.mint(bob, mintAmount, {from: admin}).catch(err => {
            assert.equal(err.reason.toString(), "Exceeds STOS token max totalSupply")
        })
        const bobBalance = await contract.balanceOf(bob)
        assert.equal(bobBalance, zeroBalance)

        const adminBalanceAfter = await contract.balanceOf(admin)
        assert.equal(adminBalanceAfter, maxTotalSupply)

        const totalSupply2 = await contract.totalSupply()
        assert.equal(totalSupply2, maxTotalSupply)

        await contract.burn(admin, mintAmount, {from: admin})

        await contract.mint(bob, mintAmount, {from: admin})
        const bobBalanceAfter = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfter, mintAmount)

        const totalSupply3 = await contract.totalSupply()
        assert.equal(totalSupply3, maxTotalSupply)
    });

    // others
    it('27. admin role check', async () => {
        const ar = await contract.DEFAULT_ADMIN_ROLE()
        assert.equal(DEFAULT_ADMIN_ROLE, ar)
    });

    it('28. mint_burn role check', async () => {
        const mr = await contract.MINT_BURN_ROLE()
        assert.equal(MINT_BURN_ROLE, mr)
    });

    it('29. transfer before & after stop', async () => {
        const pauseStatusBefore1 = await contract.stopped()
        const pauseStatusBefore2 = await contract.paused()
        assert.equal(pauseStatusBefore1, pauseStatusBefore2)
        assert.equal(pauseStatusBefore2, false)

        await contract.mint(admin, mintAmount, {from: admin})
        const adminBalanceBefore = await contract.balanceOf(admin)
        assert.equal(adminBalanceBefore, mintAmount)

        const bobBalanceBeforeStop = await contract.balanceOf(bob)
        assert.equal(bobBalanceBeforeStop, zeroBalance)

        // transfer before stop
        await contract.transfer(bob, leftOverAmount, {from: admin})
        const bobBalanceBeforeStop2 = await contract.balanceOf(bob)
        assert.equal(bobBalanceBeforeStop2, leftOverAmount)

        await contract.stop()

        const pauseStatusAfter1 = await contract.stopped()
        const pauseStatusAfter2 = await contract.paused()
        assert.equal(pauseStatusAfter1, pauseStatusAfter2)
        assert.equal(pauseStatusAfter2, true)

        // transfer after stop
        await contract.transfer(bob, leftOverAmount, {from: admin}).catch(err => {
            assert.equal(err.reason.toString(), "Pausable: paused")
        })
        const bobBalanceAfterStop = await contract.balanceOf(bob)
        assert.equal(bobBalanceAfterStop, leftOverAmount)
    });

    it('30. redeem exceeds balance', async () => {
        // mint 100 for contract address
        await contract.mint(contract.address, mintAmount, {from: admin})
        const contractBalanceBefore = await contract.balanceOf(contract.address)
        assert.equal(contractBalanceBefore, mintAmount)

        // redeem 200 to owner
        await contract.redeem(doubleMintAmount, {from: admin}).catch(err => {
            assert.equal(err.reason.toString(), "redeem can not exceed the balance");
        })
    });

    it('31. redeem success', async () => {
        // mint 100 for contract address
        await contract.mint(contract.address, mintAmount, {from: admin})
        const contractBalanceBefore = await contract.balanceOf(contract.address)
        assert.equal(contractBalanceBefore, mintAmount)

        // redeem 90 to owner
        await contract.redeem(burnAmount, {from: admin})

        // owner should have 90 spwn
        const adminBalanceAfter = await contract.balanceOf(admin)
        assert.equal(adminBalanceAfter, burnAmount)

        // contract should have 10 spwn left
        const contractBalanceAfter = await contract.balanceOf(contract.address)
        assert.equal(contractBalanceAfter, leftOverAmount)
    });
});

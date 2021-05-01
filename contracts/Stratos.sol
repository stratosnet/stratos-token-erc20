// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract DSAuth is Ownable, AccessControl {
    bytes32 public constant MINT_BURN_ROLE = keccak256("MINT_BURN_ROLE");

    // setOwner transfers the STOS token contract ownership to another address
    // along with grant new owner MINT_BURN_ROLE role and remove MINT_BURN_ROLE from old owner
    // note: call transferOwnerShip will only change ownership without other roles
    function setOwner(address newOwner) public onlyOwner {
        require(newOwner != owner(), "New owner and current owner need to be different");

        address oldOwner = owner();

        transferOwnership(newOwner);

        _grantAccess(MINT_BURN_ROLE, newOwner);
        _revokeAccess(MINT_BURN_ROLE, oldOwner);

        _setupRole(DEFAULT_ADMIN_ROLE, newOwner);
        _revokeAccess(DEFAULT_ADMIN_ROLE, oldOwner);

        emit OwnershipTransferred(oldOwner, newOwner);
    }

    // setAuthority performs the same action as grantMintBurnRole
    // we need setAuthority() only because the backward compatibility with previous version contract
    function setAuthority(address authorityAddress) public onlyOwner {
        grantMintBurnRole(authorityAddress);
    }

    // grantMintBurnRole grants the MINT_BURN_ROLE role to an address
    function grantMintBurnRole(address account) public onlyOwner {
        _grantAccess(MINT_BURN_ROLE, account);
    }

    // revokeMintBurnRole revokes the MINT_BURN_ROLE role from an address
    function revokeMintBurnRole(address account) public onlyOwner {
        _revokeAccess(MINT_BURN_ROLE, account);
    }

    // internal function _grantAccess grants account with given role
    function _grantAccess(bytes32 role, address account) internal {
        grantRole(role, account);

        emit RoleGranted(role, account, owner());
    }

    // internal function _revokeAccess revokes account with given role
    function _revokeAccess(bytes32 role, address account) internal {
        if (DEFAULT_ADMIN_ROLE == role) {
            require(account != owner(), "owner cant revoke himself from admin role");
        }

        revokeRole(role, account);

        emit RoleRevoked(role, account, owner());
    }
}

contract DSStop is Pausable, Ownable {
    // we need stopped() only because the backward compatibility with previous version contract
    // stopped = paused
    function stopped() public view returns (bool) {
        return paused();
    }

    function stop() public onlyOwner {
        _pause();

        emit Paused(owner());
    }

    function start() public onlyOwner {
        _unpause();

        emit Unpaused(owner());
    }
}

contract Stratos is ERC20("Stratos Token", "STOS"), DSAuth, DSStop {

    event Mint(address indexed guy, uint wad);
    event Burn(address indexed guy, uint wad);

    uint256 MAX_SUPPLY = 1 * 10 ** 8 * 10 ** 18; // 100,000,000 STOS Token Max Supply

    // deployer address is the default admin(owner)
    // deployer address is the first address with MINT_BURN_ROLE role
    constructor () {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantAccess(MINT_BURN_ROLE, msg.sender);
    }

    function approve(address guy, uint wad) public override whenNotPaused returns (bool) {
        return super.approve(guy, wad);
    }

    function transferFrom(address src, address dst, uint wad) public override whenNotPaused returns (bool) {
        return super.transferFrom(src, dst, wad);
    }

    function mint(address guy, uint wad) public whenNotPaused {
        require(hasRole(MINT_BURN_ROLE, msg.sender), "Caller is not allowed to mint");
        require(totalSupply() + wad <= MAX_SUPPLY, "Exceeds STOS token max totalSupply");

        _mint(guy, wad);

        emit Mint(guy, wad);
    }

    function burn(address guy, uint wad) public whenNotPaused {
        require(hasRole(MINT_BURN_ROLE, msg.sender), "Caller is not allowed to burn");

        _burn(guy, wad);

        emit Burn(guy, wad);
    }
}

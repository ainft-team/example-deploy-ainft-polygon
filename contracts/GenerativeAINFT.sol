// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/**
 * @notice This contract is temporary and will be changed after the AINFT template contract is completed.
 * Never use this in production level.
*/
contract GenerativeAINFT is ERC721URIStorage, Ownable {
    string public baseURI;
    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}

    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }
    function setBaseURI(string memory newBaseURI) public onlyOwner {
        baseURI = newBaseURI;
    }
    function setTokenURI(uint256 tokenId, string memory _tokenURI) public {
        require(_ownerOf(tokenId) == _msgSender(), "The holder only changes or updates the URI.");
        _setTokenURI(tokenId, _tokenURI);
    }
}
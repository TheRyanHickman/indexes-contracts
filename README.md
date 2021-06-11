### Contracts

`0x9d687619DE58580270a992332252479aF5dbbe10` Multisig dev team contract
`0x16149999C85c3E3f7d1B9402a4c64d125877d89D` Timelock contract (owned by multisig)
`0xA3fDF7F376F4BFD38D7C4A5cf8AAb4dE68792fd4` staking contract (owned by timelock)
`0x304c62b5B030176F8d328d3A01FEaB632FC929BA` LEV token (owned by staking contract)

`0x08Ba8CCc71D92055e4b370283AE07F773211Cc29` LI index pool
`0xB04c92A631c8c350Cf81b5b54A0FE8dfbCC68677` DBI index pool
`0xA9102b07f1F577D7c58E481a8CbdB2630637Ea48` SI index pool

### Audit feedback

If you look at the git commit history, you will find various fixes addressing findings from Certik audit report.
We have a few comments on some findings:

_IPC-03 - Code Simplify_

We don't think the suggested change would work. We need to sell all tokens first in order to finance the purchase of tokens.  
For example if the first weight has been increased and the first operation in the loop is a purchase of tokens, the current contract balance wouldn't be enough. The balance could be 0 and the purchase would fail.  
Moreover, optimizing gas usage for this function is not a priority since it's meant to be called rarely by the contract owner only.

_ICC-02 - Privilege Access for redistributeFees_

We don't think a change is necessary there. We trust the function behavior so anyone can call it. It doesn't take any parameter and doesn't rely on msg.sender.

_MCC-07 - Incompatibility With Deflationary Tokens_

We don't plan on adding deflationary tokens to our staking pools. We currently don't have plans to add more than staking pools related to the LEV token and our Index tokens.  
We've added a comment warning ourselves to not add a deflationary token to a staking pool, but again we are not planning on adding other projects token anyway.  
We also don't want to limit the set of staking tokens because we plan on adding Lev Index token staking for new indices that we release.

_Centralized Risks_

We will be deploying our ownable contracts behind OpenZepplin's timelock contract with a delay of 48h. We will also be using the gnosis safe wallet to send transactions to the timelock contract.  
Please verify this with the addresses after the final deployment.

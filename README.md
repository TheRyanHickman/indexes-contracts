### Audit feedback

If you look at the git commit history, you will find various fixes addressing findings from Certik audit report.
We have a few comments on some findings:

*IPC-03 - Code Simplify*

We don't think the suggested change would work. We need to sell all tokens first in order to finance the purchase of tokens.  
For example if the first weight has been increased and the first operation in the loop is a purchase of tokens, the current contract balance wouldn't be enough. The balance could be 0 and the purchase would fail.  
Moreover, optimizing gas usage for this function is not a priority since it's meant to be called rarely by the contract owner only.

*ICC-02 - Privilege Access for redistributeFees*

We don't think a change is necessary there. We trust the function behavior so anyone can call it. It doesn't take any parameter and doesn't rely on msg.sender.

*MCC-07 - Incompatibility With Deflationary Tokens*

We don't plan on adding deflationary tokens to our staking pools. We currently don't have plans to add more than staking pools related to the LEV token and our Index tokens.  
We've added a comment warning ourselves to not add a deflationary token to a staking pool, but again we are not planning on adding other projects token anyway.  
We also don't want to limit the set of staking tokens because we plan on adding Lev Index token staking for new indices that we release.

*Centralized Risks*

We will be deploying our ownable contracts behind OpenZepplin's timelock contract with a delay of 48h. We will also be using the gnosis safe wallet to send transactions to the timelock contract.  
Please verify this with the addresses after the final deployment.

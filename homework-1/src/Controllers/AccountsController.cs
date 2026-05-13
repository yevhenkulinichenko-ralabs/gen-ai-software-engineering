using BankingTransactionsApi.Models;
using BankingTransactionsApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace BankingTransactionsApi.Controllers;

[ApiController]
[Route("accounts")]
public class AccountsController : ControllerBase
{
    private readonly TransactionStore _store;
    private readonly CurrencyConverter _converter;

    public AccountsController(TransactionStore store, CurrencyConverter converter)
    {
        _store = store;
        _converter = converter;
    }

    [HttpGet("{accountId}/balance")]
    public ActionResult<AccountBalanceResponse> GetBalance(
        string accountId,
        [FromQuery] string currency = "USD")
    {
        if (!_converter.IsSupported(currency))
            return BadRequest(new { message = $"Unsupported currency for conversion: {currency}" });

        var transactions = _store.GetAll()
            .Where(t => t.FromAccount == accountId || t.ToAccount == accountId)
            .ToList();

        if (transactions.Count == 0)
            return NotFound(new { message = $"Account {accountId} not found" });

        var balance = transactions
            .Where(t => t.Status != "failed")
            .Sum(t =>
            {
                var converted = _converter.Convert(t.Amount, t.Currency, currency);
                return t.ToAccount == accountId ? converted : -converted;
            });

        return Ok(new AccountBalanceResponse
        {
            AccountId = accountId,
            Balance = balance,
            Currency = currency.ToUpper()
        });
    }

    [HttpGet("{accountId}/summary")]
    public ActionResult<AccountSummaryResponse> GetSummary(string accountId)
    {
        var transactions = _store.GetAll()
            .Where(t => t.FromAccount == accountId || t.ToAccount == accountId)
            .ToList();

        if (transactions.Count == 0)
            return NotFound(new { message = $"Account {accountId} not found" });

        return Ok(new AccountSummaryResponse
        {
            AccountId = accountId,
            TotalDeposits = transactions
                .Where(t => t.Type == "deposit" && t.ToAccount == accountId)
                .Sum(t => t.Amount),
            TotalWithdrawals = transactions
                .Where(t => t.Type == "withdrawal" && t.FromAccount == accountId)
                .Sum(t => t.Amount),
            TransactionCount = transactions.Count,
            MostRecentTransactionDate = transactions.Max(t => t.Timestamp)
        });
    }
}

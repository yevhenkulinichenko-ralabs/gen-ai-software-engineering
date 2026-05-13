using BankingTransactionsApi.Models;
using BankingTransactionsApi.Services;
using BankingTransactionsApi.Validators;
using Microsoft.AspNetCore.Mvc;

namespace BankingTransactionsApi.Controllers;

[ApiController]
[Route("transactions")]
public class TransactionsController : ControllerBase
{
    private readonly TransactionStore _store;

    public TransactionsController(TransactionStore store)
    {
        _store = store;
    }

    [HttpGet]
    public ActionResult<IEnumerable<Transaction>> GetAll(
        [FromQuery] string? accountId,
        [FromQuery] string? type,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to)
    {
        var transactions = _store.GetAll().AsEnumerable();

        if (accountId is not null)
            transactions = transactions.Where(t => t.FromAccount == accountId || t.ToAccount == accountId);

        if (type is not null)
            transactions = transactions.Where(t => t.Type == type.ToLower());

        if (from is not null)
            transactions = transactions.Where(t => DateOnly.FromDateTime(t.Timestamp) >= from.Value);

        if (to is not null)
            transactions = transactions.Where(t => DateOnly.FromDateTime(t.Timestamp) <= to.Value);

        return Ok(transactions);
    }

    [HttpGet("{id}")]
    public ActionResult<Transaction> GetById(string id)
    {
        var transaction = _store.GetById(id);
        return transaction is null ? NotFound() : Ok(transaction);
    }

    [HttpPost]
    public ActionResult<Transaction> Create(CreateTransactionRequest request)
    {
        var errors = TransactionValidator.Validate(request);
        if (errors.Count > 0)
            return BadRequest(new ValidationErrorResponse { Details = errors });

        var transaction = new Transaction
        {
            FromAccount = request.FromAccount,
            ToAccount = request.ToAccount,
            Amount = request.Amount,
            Currency = request.Currency,
            Type = request.Type,
            Status = request.Status
        };

        _store.Add(transaction);
        return CreatedAtAction(nameof(GetById), new { id = transaction.Id }, transaction);
    }
}

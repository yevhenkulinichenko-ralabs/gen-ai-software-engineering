using BankingTransactionsApi.Models;

namespace BankingTransactionsApi.Services;

public class TransactionStore
{
    private readonly List<Transaction> _transactions = [];

    public IReadOnlyList<Transaction> GetAll() => _transactions.AsReadOnly();

    public Transaction? GetById(string id) =>
        _transactions.FirstOrDefault(t => t.Id == id);

    public Transaction Add(Transaction transaction)
    {
        _transactions.Add(transaction);
        return transaction;
    }
}

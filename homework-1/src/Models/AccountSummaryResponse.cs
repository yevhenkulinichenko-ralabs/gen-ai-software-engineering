namespace BankingTransactionsApi.Models;

public class AccountSummaryResponse
{
    public string AccountId { get; set; } = string.Empty;
    public decimal TotalDeposits { get; set; }
    public decimal TotalWithdrawals { get; set; }
    public int TransactionCount { get; set; }
    public DateTime MostRecentTransactionDate { get; set; }
}

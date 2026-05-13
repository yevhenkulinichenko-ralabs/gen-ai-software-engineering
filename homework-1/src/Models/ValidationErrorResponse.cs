namespace BankingTransactionsApi.Models;

public class ValidationErrorResponse
{
    public string Error { get; } = "Validation failed";
    public List<FieldError> Details { get; set; } = [];
}

public class FieldError
{
    public string Field { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

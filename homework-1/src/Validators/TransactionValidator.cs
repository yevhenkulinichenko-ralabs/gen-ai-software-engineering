using System.Text.RegularExpressions;
using BankingTransactionsApi.Models;

namespace BankingTransactionsApi.Validators;

public static partial class TransactionValidator
{
    [GeneratedRegex(@"^ACC-[A-Za-z0-9]{5}$")]
    private static partial Regex AccountPattern();

    private static readonly HashSet<string> ValidTypes = ["deposit", "withdrawal", "transfer"];
    private static readonly HashSet<string> ValidStatuses = ["pending", "completed", "failed"];

    private static readonly HashSet<string> ValidCurrencies =
    [
        "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN",
        "BAM", "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BRL",
        "BSD", "BTN", "BWP", "BYN", "BZD", "CAD", "CDF", "CHF", "CLP", "CNY",
        "COP", "CRC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP",
        "ERN", "ETB", "EUR", "FJD", "FKP", "GBP", "GEL", "GHS", "GIP", "GMD",
        "GNF", "GTQ", "GYD", "HKD", "HNL", "HTG", "HUF", "IDR", "ILS", "INR",
        "IQD", "IRR", "ISK", "JMD", "JOD", "JPY", "KES", "KGS", "KHR", "KMF",
        "KPW", "KRW", "KWD", "KYD", "KZT", "LAK", "LBP", "LKR", "LRD", "LSL",
        "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MRU", "MUR",
        "MVR", "MWK", "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK", "NPR",
        "NZD", "OMR", "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR",
        "RON", "RSD", "RUB", "RWF", "SAR", "SBD", "SCR", "SDG", "SEK", "SGD",
        "SHP", "SLE", "SOS", "SRD", "SSP", "STN", "SYP", "SZL", "THB", "TJS",
        "TMT", "TND", "TOP", "TRY", "TTD", "TWD", "TZS", "UAH", "UGX", "USD",
        "UYU", "UZS", "VES", "VND", "VUV", "WST", "XAF", "XCD", "XOF", "XPF",
        "YER", "ZAR", "ZMW", "ZWL"
    ];

    public static List<FieldError> Validate(CreateTransactionRequest request)
    {
        var errors = new List<FieldError>();

        if (request.Amount <= 0)
            errors.Add(new FieldError { Field = "amount", Message = "amount is required and must be a positive number" });
        else if (request.Amount != Math.Round(request.Amount, 2))
            errors.Add(new FieldError { Field = "amount", Message = "Amount must have at most 2 decimal places" });

        if (string.IsNullOrWhiteSpace(request.FromAccount))
            errors.Add(new FieldError { Field = "fromAccount", Message = "fromAccount is required" });
        else if (!AccountPattern().IsMatch(request.FromAccount))
            errors.Add(new FieldError { Field = "fromAccount", Message = "Account number must follow the format ACC-XXXXX (5 alphanumeric characters)" });

        if (string.IsNullOrWhiteSpace(request.ToAccount))
            errors.Add(new FieldError { Field = "toAccount", Message = "toAccount is required" });
        else if (!AccountPattern().IsMatch(request.ToAccount))
            errors.Add(new FieldError { Field = "toAccount", Message = "Account number must follow the format ACC-XXXXX (5 alphanumeric characters)" });

        if (string.IsNullOrWhiteSpace(request.Currency))
            errors.Add(new FieldError { Field = "currency", Message = "currency is required" });
        else if (!ValidCurrencies.Contains(request.Currency))
            errors.Add(new FieldError { Field = "currency", Message = "Invalid currency code" });

        if (string.IsNullOrWhiteSpace(request.Type))
            errors.Add(new FieldError { Field = "type", Message = "type is required" });
        else if (!ValidTypes.Contains(request.Type))
            errors.Add(new FieldError { Field = "type", Message = "Type must be one of: deposit, withdrawal, transfer" });

        if (string.IsNullOrWhiteSpace(request.Status))
            errors.Add(new FieldError { Field = "status", Message = "status is required" });
        else if (!ValidStatuses.Contains(request.Status))
            errors.Add(new FieldError { Field = "status", Message = "Status must be one of: pending, completed, failed" });

        return errors;
    }
}

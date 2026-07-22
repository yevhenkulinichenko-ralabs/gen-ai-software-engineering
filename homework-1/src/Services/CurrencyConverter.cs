namespace BankingTransactionsApi.Services;

public class CurrencyConverter
{
    // Approximate static rates: 1 USD = X of the given currency
    private static readonly Dictionary<string, decimal> RatesFromUsd = new(StringComparer.OrdinalIgnoreCase)
    {
        ["USD"] = 1m,
        ["EUR"] = 0.92m,
        ["GBP"] = 0.79m,
        ["JPY"] = 149.50m,
        ["CHF"] = 0.90m,
        ["CAD"] = 1.36m,
        ["AUD"] = 1.53m,
        ["NZD"] = 1.63m,
        ["CNY"] = 7.24m,
        ["HKD"] = 7.82m,
        ["SGD"] = 1.34m,
        ["KRW"] = 1325.00m,
        ["INR"] = 83.12m,
        ["THB"] = 35.12m,
        ["MYR"] = 4.72m,
        ["IDR"] = 15650.00m,
        ["PHP"] = 56.25m,
        ["TWD"] = 31.65m,
        ["VND"] = 24485.00m,
        ["SEK"] = 10.42m,
        ["NOK"] = 10.55m,
        ["DKK"] = 6.88m,
        ["PLN"] = 3.98m,
        ["CZK"] = 22.85m,
        ["HUF"] = 355.00m,
        ["RON"] = 4.57m,
        ["BGN"] = 1.80m,
        ["BRL"] = 4.97m,
        ["MXN"] = 17.15m,
        ["ARS"] = 830.00m,
        ["CLP"] = 935.00m,
        ["COP"] = 3950.00m,
        ["PEN"] = 3.72m,
        ["AED"] = 3.67m,
        ["SAR"] = 3.75m,
        ["QAR"] = 3.64m,
        ["KWD"] = 0.31m,
        ["BHD"] = 0.38m,
        ["ILS"] = 3.72m,
        ["TRY"] = 30.50m,
        ["ZAR"] = 18.63m,
        ["EGP"] = 30.90m,
        ["RUB"] = 90.50m,
        ["UAH"] = 37.50m,
        ["PKR"] = 278.50m,
        ["BDT"] = 110.00m,
        ["NPR"] = 133.00m,
        ["LKR"] = 315.00m,
    };

    public bool IsSupported(string currency) =>
        RatesFromUsd.ContainsKey(currency);

    public decimal Convert(decimal amount, string fromCurrency, string toCurrency)
    {
        if (string.Equals(fromCurrency, toCurrency, StringComparison.OrdinalIgnoreCase))
            return amount;

        // Convert to USD as intermediate, then to target currency
        var amountInUsd = amount / RatesFromUsd[fromCurrency];
        return Math.Round(amountInUsd * RatesFromUsd[toCurrency], 2);
    }
}

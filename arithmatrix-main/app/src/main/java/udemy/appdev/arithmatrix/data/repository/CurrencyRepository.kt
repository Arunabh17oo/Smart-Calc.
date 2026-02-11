package udemy.appdev.arithmatrix.data.repository

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import udemy.appdev.arithmatrix.data.CurrencyResponse
import udemy.appdev.arithmatrix.data.RetrofitInstance

class CurrencyRepository {

    // Cached list of supported currencies (for dropdowns)
    private val supportedCurrencies = listOf(
        "USD", "EUR", "INR", "GBP", "JPY", "CAD", "AUD", "CNY"
    ) // can expand as needed

    fun getSupportedCurrencies(): List<String> = supportedCurrencies

    // Convert amount between two currencies
    suspend fun convertCurrency(
        amount: Double,
        from: String,
        to: String
    ): Double? {
        return withContext(Dispatchers.IO) {
            try {
                val response: CurrencyResponse =
                    RetrofitInstance.api.convertCurrency(amount, from, to)
                response.rates[to] // return only the converted value
            } catch (e: Exception) {
                e.printStackTrace()
                null
            }
        }
    }

    // Get multiple rates for a base currency (optional helper)
    suspend fun getRatesForBase(base: String): Map<String, Double>? {
        return withContext(Dispatchers.IO) {
            try {
                val response = RetrofitInstance.api.getRatesForBase(base)
                response.rates
            } catch (e: Exception) {
                e.printStackTrace()
                null
            }
        }
    }
}

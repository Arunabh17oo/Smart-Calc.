package udemy.appdev.arithmatrix.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import udemy.appdev.arithmatrix.data.repository.CurrencyRepository


class CurrencyViewModel(
    private val repository: CurrencyRepository = CurrencyRepository()
) : ViewModel() {

    // Supported currencies for dropdown
    val supportedCurrencies: List<String> = repository.getSupportedCurrencies()

    // User input states
    private val _amount = MutableStateFlow("")
    val amount: StateFlow<String> = _amount

    private val _fromCurrency = MutableStateFlow("USD")
    val fromCurrency: StateFlow<String> = _fromCurrency

    private val _toCurrency = MutableStateFlow("INR")
    val toCurrency: StateFlow<String> = _toCurrency

    // Conversion result
    private val _result = MutableStateFlow<String>("")
    val result: StateFlow<String> = _result

    // Loading + error handling
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    private val _convertedText = MutableStateFlow("")
    val convertedText: StateFlow<String> = _convertedText


    // ----------------------------
    //  Public methods for UI calls
    // ----------------------------

    fun onAmountChanged(newAmount: String) {
        _amount.value = newAmount
    }

    fun onFromCurrencyChanged(currency: String) {
        _fromCurrency.value = currency
    }

    fun onToCurrencyChanged(currency: String) {
        _toCurrency.value = currency
    }

    fun swapCurrencies() {
        val oldFrom = _fromCurrency.value
        _fromCurrency.value = _toCurrency.value
        _toCurrency.value = oldFrom
    }

    fun convert() {
        val amt = amount.value.toDoubleOrNull()
        if (amt == null || amt <= 0.0) {
            _error.value = "Please enter a valid amount"
            return
        }

        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val resultValue = repository.convertCurrency(
                    amt,
                    fromCurrency.value,
                    toCurrency.value
                )
                _result.value = "%.2f".format(resultValue)

                // freeze full display text here
                _convertedText.value =
                    "${"%.2f".format(amt)} ${fromCurrency.value} = ${_result.value} ${toCurrency.value}"

            } catch (e: Exception) {
                _error.value = e.message ?: "Conversion failed"
            } finally {
                _isLoading.value = false
            }
        }
    }
}

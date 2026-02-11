package udemy.appdev.arithmatrix.ui.basic

import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import udemy.appdev.arithmatrix.data.local.HistoryEntity
import udemy.appdev.arithmatrix.data.repository.HistoryRepository
import udemy.appdev.arithmatrix.engine.CalculatorEngine
import java.util.*
import javax.inject.Inject

@HiltViewModel
class BasicViewModel @Inject constructor(
    private val historyRepository: HistoryRepository,
    private val calculatorEngine: CalculatorEngine
) : ViewModel() {

    var expression = mutableStateOf("")
        private set

    var result = mutableStateOf("")
        private set

    fun onInput(input: String) {
        when (input) {
            "AC" -> {
                expression.value = ""
                result.value = ""
            }

            "⌫" -> {
                if (expression.value.isNotEmpty()) {
                    expression.value = expression.value.dropLast(1)
                }
            }

            "=" -> {
                try {
                    val res = calculatorEngine.evaluate(expression.value).toString()
                    result.value = res

                    viewModelScope.launch {
                        historyRepository.insert(
                            HistoryEntity(
                                expression = expression.value,
                                result = res,
                                timestamp = System.currentTimeMillis()
                            )
                        )
                    }
                } catch (e: Exception) {
                    result.value = "Error"
                }
            }

            "%" -> {
                expression.value += "%"
            }

            else -> {
                expression.value += input
            }
        }
    }
}
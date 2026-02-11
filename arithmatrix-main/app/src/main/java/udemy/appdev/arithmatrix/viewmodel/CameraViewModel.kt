package udemy.appdev.arithmatrix.viewmodel

import android.graphics.Bitmap
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import udemy.appdev.arithmatrix.engine.CalculatorEngine

class CameraViewModel : ViewModel() {

    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    private val calculatorEngine = CalculatorEngine()

    private val _recognizedText = MutableStateFlow("")
    val recognizedText: StateFlow<String> get() = _recognizedText

    private val _result = MutableStateFlow("")
    val result: StateFlow<String> get() = _result

    private val _isProcessing = MutableStateFlow(false)
    val isProcessing: StateFlow<Boolean> get() = _isProcessing

    /** Process bitmap through ML Kit OCR and evaluate as math expression */
    fun processImage(bitmap: Bitmap) {
        _isProcessing.value = true

        val image = InputImage.fromBitmap(bitmap, 0)

        recognizer.process(image)
            .addOnSuccessListener { visionText ->
                val extracted = visionText.text.replace("\\s".toRegex(), "")
                _recognizedText.value = extracted

                _result.value = try {
                    calculatorEngine.evaluate(extracted).toString()
                } catch (e: Exception) {
                    "Error"
                }

                _isProcessing.value = false
            }
            .addOnFailureListener {
                _recognizedText.value = ""
                _result.value = "Error"
                _isProcessing.value = false
            }
    }
    fun clearAll() {
        _result.value = ""
        _recognizedText.value = ""
    }
}
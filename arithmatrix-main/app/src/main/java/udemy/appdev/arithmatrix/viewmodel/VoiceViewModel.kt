package udemy.appdev.arithmatrix.viewmodel

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import udemy.appdev.arithmatrix.data.local.HistoryEntity
import udemy.appdev.arithmatrix.data.repository.HistoryRepository
import udemy.appdev.arithmatrix.engine.CalculatorEngine
import java.util.Locale
import javax.inject.Inject

@HiltViewModel
class VoiceViewModel @Inject constructor(
    @ApplicationContext private val appContext: Context,
    private val repo: HistoryRepository,
    private val calculatorEngine: CalculatorEngine
): ViewModel() {

    private val _expression = MutableStateFlow("")
    val expression: StateFlow<String> = _expression

    private val _result = MutableStateFlow("")
    val result: StateFlow<String> = _result

    private val _isListening = MutableStateFlow(false)
    val isListening: StateFlow<Boolean> = _isListening

    private val _ttsEnabled = MutableStateFlow(true)
    val ttsEnabled: StateFlow<Boolean> = _ttsEnabled

    private var tts: TextToSpeech? = null

    init {
        tts = TextToSpeech(appContext) { status ->
            if (status == TextToSpeech.SUCCESS) {
                tts?.language = Locale.getDefault()
            }
        }
    }



    private val recognizer: SpeechRecognizer = SpeechRecognizer.createSpeechRecognizer(appContext).apply{
        setRecognitionListener(object: RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onError(error: Int) {
                _isListening.value = false
            }

            override fun onPartialResults(partialResults: Bundle?) {
                val list = partialResults?.getCharSequenceArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                if(!list.isNullOrEmpty()) _expression.value = list[0].toString()
            }

            override fun onResults(results: Bundle) {
                _isListening.value = false
                val list = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                val spoken = list?.firstOrNull().orEmpty()
                handleFinalText(spoken)
            }

            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
    }

    fun toggleTts() { _ttsEnabled.value = !_ttsEnabled.value }

    fun startListening() {
        if (_isListening.value) return
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        }
        _expression.value = ""
        _result.value = ""
        recognizer.startListening(intent)
        _isListening.value = true
    }

    fun stopListening() {
        recognizer.stopListening()
        _isListening.value = false
    }

    private fun handleFinalText(text: String) {
        _expression.value = text
        val normalized = normalize(text)
        val res = try { calculatorEngine.evaluate(normalized).toString() } catch (_: Exception) { "Error" }
        _result.value = res

        viewModelScope.launch {
            repo.insert(HistoryEntity(expression = text, result = res, source = "VOICE"))
        }
        if (_ttsEnabled.value && res != "Error") speak(res)
    }

    private fun normalize(raw: String): String {
        // ultra-basic normalization: “times” → *, “divide” → /, remove words
        return raw.lowercase(Locale.getDefault())
            .replace("x", "*").replace("×","*").replace("times","*")
            .replace("into","*")
            .replace("divide by","/").replace("divided by","/").replace("÷","/")
            .replace("plus","+").replace("minus","-")
            .replace("\\s+".toRegex(), " ")
            .trim()
    }

    private fun speak(text: String) {
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "voice_result")
    }

    override fun onCleared() {
        super.onCleared()
        recognizer.destroy()
        tts?.shutdown()
    }
}
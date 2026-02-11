package udemy.appdev.arithmatrix.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import udemy.appdev.arithmatrix.data.local.HistoryEntity
import udemy.appdev.arithmatrix.data.repository.HistoryRepository
import javax.inject.Inject

@HiltViewModel
class VoiceHistoryViewModel @Inject constructor(
    private val repo: HistoryRepository
) : ViewModel() {

    val history = repo.getBySource("VOICE")
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun delete(entry: HistoryEntity) {
        viewModelScope.launch {
            repo.delete(entry) // ✅ Use repo instead of repository
        }
    }
}

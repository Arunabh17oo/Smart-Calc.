package udemy.appdev.arithmatrix.data.repository

import kotlinx.coroutines.flow.Flow
import udemy.appdev.arithmatrix.data.local.HistoryDAO
import udemy.appdev.arithmatrix.data.local.HistoryEntity

class HistoryRepository(
    private val dao: HistoryDAO
) {
    suspend fun insert(history: HistoryEntity) {
        dao.insert(history)
    }

    fun getAllHistory(): Flow<List<HistoryEntity>>{
        return dao.getAllHistory()
    }

    fun getBySource(source : String): Flow<List<HistoryEntity>>{
        return dao.getHistoryBySource(source)
    }

    suspend fun delete(history: HistoryEntity){
        dao.delete(history)
    }

    suspend fun clearAll(){
        dao.clearAll()
    }
}
package udemy.appdev.arithmatrix.data.local

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface HistoryDAO {
    @Insert
    suspend fun insert(historyEntity: HistoryEntity)

    @Query("SELECT * FROM history ORDER BY timestamp DESC")
    fun getAllHistory(): Flow<List<HistoryEntity>>

    @Query("SELECT * FROM history WHERE source = :source ORDER BY timestamp DESC")
    fun getHistoryBySource(source: String): Flow<List<HistoryEntity>>

    @Delete
    suspend fun delete(historyEntity: HistoryEntity)

    @Query("DELETE FROM history")
    suspend fun clearAll()
}
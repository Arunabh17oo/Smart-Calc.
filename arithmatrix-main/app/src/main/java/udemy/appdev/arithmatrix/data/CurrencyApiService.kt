package udemy.appdev.arithmatrix.data

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.Query

data class CurrencyResponse(
    val amount: Double,
    val base: String,
    val date: String,
    val rates: Map<String, Double>
)

interface CurrencyApiService {
    @GET("latest")
    suspend fun convertCurrency(
        @Query("amount") amount: Double,
        @Query("from") from: String,
        @Query("to") to: String
    ): CurrencyResponse

    @GET("latest")
    suspend fun getRatesForBase(
        @Query("from") base : String
    ): CurrencyResponse
}

object RetrofitInstance {
    private const val BASE_URL = "https://api.frankfurter.app/"

    val api: CurrencyApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(CurrencyApiService::class.java)
    }
}
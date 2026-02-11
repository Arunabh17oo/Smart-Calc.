package udemy.appdev.arithmatrix

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import udemy.appdev.arithmatrix.ui.basic.BasicScreen
import udemy.appdev.arithmatrix.ui.camera.CameraScreen
import udemy.appdev.arithmatrix.ui.currency.CurrencyScreen
import udemy.appdev.arithmatrix.ui.history.HistoryScreen
import udemy.appdev.arithmatrix.ui.history.VoiceHistoryScreen
import udemy.appdev.arithmatrix.ui.voice.VoiceScreen

@Composable
fun NavGraph(navController: NavHostController, modifier: Modifier = Modifier){
    NavHost(navController = navController, startDestination = "basic", modifier = modifier){
        composable("basic"){
            BasicScreen(navController)
        }
        composable("voice"){
            VoiceScreen(navController)
        }
        composable("camera"){
            CameraScreen(navController)
        }
        composable("currency"){
            CurrencyScreen(navController)
        }
        composable("history"){
            HistoryScreen(navController)
        }
        composable("voiceHistory"){
            VoiceHistoryScreen(navController)
        }
        composable("camera"){
            CameraScreen(navController = navController)
        }
        composable("currency"){
            CurrencyScreen(navController = navController)
        }
    }
}
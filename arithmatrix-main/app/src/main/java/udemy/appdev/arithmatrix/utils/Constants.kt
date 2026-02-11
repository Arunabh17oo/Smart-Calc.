package udemy.appdev.arithmatrix.utils

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CurrencyExchange
import androidx.compose.material.icons.filled.Mic
import androidx.compose.ui.graphics.vector.ImageVector

object Constants {
    const val ROUTE_BASIC = "basic"
    const val ROUTE_VOICE = "voice"
    const val ROUTE_CAMERA = "camera"
    const val ROUTE_CURRENCY = "currency"

    val bottomNavItems = listOf(
        BottomNavItem(ROUTE_BASIC, Icons.Filled.Calculate, "Basic"),
        BottomNavItem(ROUTE_VOICE, Icons.Filled.Mic, "Voice"),
        BottomNavItem(ROUTE_CAMERA, Icons.Filled.CameraAlt, "Camera"),
        BottomNavItem(ROUTE_CURRENCY, Icons.Filled.CurrencyExchange, "Currency")
    )
}

package udemy.appdev.arithmatrix.ui.voice

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Hearing
import androidx.compose.material.icons.filled.HearingDisabled
import androidx.compose.material.icons.filled.History
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import androidx.navigation.NavHostController
import udemy.appdev.arithmatrix.ui.BottomNavBar
import udemy.appdev.arithmatrix.viewmodel.VoiceViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VoiceScreen(
    navController: NavHostController,
    viewModel: VoiceViewModel = hiltViewModel(),
    modifier: Modifier = Modifier
) {
    val expression by viewModel.expression.collectAsState()
    val result by viewModel.result.collectAsState()
    val isListening by viewModel.isListening.collectAsState()
    val ttsEnabled by viewModel.ttsEnabled.collectAsState()

    val ctx = LocalContext.current
    val hasMicPerm = remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECORD_AUDIO)
                    == PackageManager.PERMISSION_GRANTED
        )
    }
    val micPermLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasMicPerm.value = granted
        if (granted) viewModel.startListening()
    }

    val pulse = rememberInfiniteTransition(label = "micPulse")
        .animateFloat(
            initialValue = 0.95f,
            targetValue = 1.05f,
            animationSpec = infiniteRepeatable(tween(700), RepeatMode.Reverse),
            label = "scale"
        ).value

    Scaffold(
        topBar = {
            VoiceTopBar(navController)
        },
        bottomBar = {
            BottomNavBar(navController = navController)
        }
    ) { innerPadding ->

        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(16.dp)
                .padding(innerPadding),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("Expression", style = MaterialTheme.typography.titleMedium)
                Text(
                    expression.ifEmpty { "Say something like: '12 plus 5 times 3'" },
                    style = MaterialTheme.typography.headlineSmall
                )
                Spacer(Modifier.height(16.dp))
                Text("Result", style = MaterialTheme.typography.titleMedium)
                Text(result.ifEmpty { "—" }, style = MaterialTheme.typography.headlineMedium)
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // TTS toggle
                FilledTonalIconButton(onClick = { viewModel.toggleTts() }) {
                    Icon(
                        imageVector = if (ttsEnabled) Icons.Default.Hearing else Icons.Default.HearingDisabled,
                        contentDescription = "Toggle TTS"
                    )
                }

                // Mic
                FloatingActionButton(
                    onClick = {
                        if (!hasMicPerm.value) {
                            micPermLauncher.launch(Manifest.permission.RECORD_AUDIO)
                        } else {
                            if (isListening) viewModel.stopListening() else viewModel.startListening()
                        }
                    },
                    modifier = Modifier.size(88.dp * if (isListening) pulse else 1f)
                ) {
                    Icon(Icons.Default.GraphicEq, contentDescription = "Mic")
                }

            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VoiceTopBar(navController: NavHostController) {
    CenterAlignedTopAppBar(title = {
        Text(text = "ArithMatrix - Voice Mode",
            style = MaterialTheme.typography.titleLarge.copy(
                fontWeight = FontWeight.Bold
            )
        )
    },
        actions = {
            IconButton(onClick = { navController.navigate("voiceHistory") }) {
                Icon(
                    imageVector = Icons.Default.History,
                    contentDescription = "Voice History"
                )
            }
        },
        colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer,
            titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
        ),
        scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()
    )
}

package udemy.appdev.arithmatrix.ui.basic

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Backspace
import androidx.compose.material.icons.filled.History
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import androidx.navigation.NavHostController
import udemy.appdev.arithmatrix.ui.BottomNavBar

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BasicScreen(
    navController: NavHostController,
    viewModel: BasicViewModel = hiltViewModel(),
    modifier: Modifier = Modifier
) {
    val expression by viewModel.expression
    val result by viewModel.result


    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text(
                        text = "ArithMatrix",
                        style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold)
                    )
                },
                actions = {
                    IconButton(onClick = { navController.navigate("history") }) {
                        Icon(
                            imageVector = Icons.Default.History,
                            contentDescription = "history"
                        )
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                )
            )
        },
        bottomBar = { BottomNavBar(navController = navController) }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(innerPadding)
        ) {
            // Display section
            Column(
                modifier = Modifier
                    .weight(0.25f)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.Bottom,
                horizontalAlignment = Alignment.End
            ) {
                Text(
                    text = expression,
                    fontSize = 28.sp,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.8f),
                    textAlign = TextAlign.End
                )
                Text(
                    text = result,
                    fontSize = 40.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                    textAlign = TextAlign.End
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Buttons section
            Column(
                modifier = Modifier
                    .weight(0.75f)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val buttonModifier = Modifier
                    .weight(1f)
                    .aspectRatio(1f)

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    CalcButton("AC", Color(0xFF9E9E9E), buttonModifier) { viewModel.onInput("AC") }
                    CalcButton("%", Color(0xFF9E9E9E), buttonModifier) { viewModel.onInput("%") }
                    CalcButton(
                        icon = Icons.Default.Backspace,
                        background = Color(0xFF9E9E9E),
                        modifier = buttonModifier
                    ) { viewModel.onInput("⌫") }
                    CalcButton(
                        "÷",
                        MaterialTheme.colorScheme.secondary,
                        buttonModifier
                    ) { viewModel.onInput("÷") }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    listOf("7", "8", "9").forEach {
                        CalcButton(it, Color(0xFF616161), buttonModifier) { viewModel.onInput(it) }
                    }
                    CalcButton(
                        "×",
                        MaterialTheme.colorScheme.secondary,
                        buttonModifier
                    ) { viewModel.onInput("×") }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    listOf("4", "5", "6").forEach {
                        CalcButton(it, Color(0xFF616161), buttonModifier) { viewModel.onInput(it) }
                    }
                    CalcButton(
                        "-",
                        MaterialTheme.colorScheme.secondary,
                        buttonModifier
                    ) { viewModel.onInput("-") }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    listOf("1", "2", "3").forEach {
                        CalcButton(it, Color(0xFF616161), buttonModifier) { viewModel.onInput(it) }
                    }
                    CalcButton(
                        "+",
                        MaterialTheme.colorScheme.secondary,
                        buttonModifier
                    ) { viewModel.onInput("+") }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    listOf("00", "0", ".").forEach {
                        CalcButton(
                            it,
                            Color(0xFF616161),
                            modifier = Modifier
                                .weight(1f)
                                .aspectRatio(1f)
                        ) { viewModel.onInput(it) }
                    }

                    CalcButton(
                        "=",
                        MaterialTheme.colorScheme.primary,
                        modifier = Modifier
                            .weight(1f)
                            .aspectRatio(1f)
                    ) { viewModel.onInput("=") }
                }


            }
        }
    }
}

@Composable
fun CalcButton(
    text: String? = null,
    background: Color,
    modifier: Modifier = Modifier,
    icon: androidx.compose.ui.graphics.vector.ImageVector? = null,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        shape = CircleShape,
        colors = ButtonDefaults.buttonColors(containerColor = background),
        modifier = modifier
            .padding(2.dp)
    ) {
        if (text != null) {
            Text(
                text = text,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                maxLines = 1,
                softWrap = false
            )
        } else if (icon != null) {
            Icon(
                icon,
                contentDescription = null,
                tint = Color.White
            )
        }
    }
}
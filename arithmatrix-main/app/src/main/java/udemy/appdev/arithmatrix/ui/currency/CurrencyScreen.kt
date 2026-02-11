package udemy.appdev.arithmatrix.ui.currency

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import androidx.navigation.NavHostController
import udemy.appdev.arithmatrix.ui.BottomNavBar
import udemy.appdev.arithmatrix.ui.camera.CameraTopBar
import udemy.appdev.arithmatrix.viewmodel.CameraViewModel
import udemy.appdev.arithmatrix.viewmodel.CurrencyViewModel



@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CurrencyScreen(
    navController: NavHostController,
    currencyViewModel: CurrencyViewModel = viewModel()
) {
    // Bind to ViewModel state
    val amount by currencyViewModel.amount.collectAsState()
    val fromCurrency by currencyViewModel.fromCurrency.collectAsState()
    val toCurrency by currencyViewModel.toCurrency.collectAsState()
    val result by currencyViewModel.result.collectAsState()
    val isLoading by currencyViewModel.isLoading.collectAsState()
    val error by currencyViewModel.error.collectAsState()

    // supported currencies from repo (static cached)
    val currencies = currencyViewModel.supportedCurrencies

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text(
                        text = "ArithMatrix - Currency Convertor",
                        style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold)
                    )
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                )
            )
        },
        bottomBar = { BottomNavBar(navController = navController) }
    ) { innerPadding ->
        Box(modifier = Modifier
            .fillMaxSize()
            .padding(innerPadding)) {

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.Top,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {

                // Amount input (string kept in ViewModel)
                OutlinedTextField(
                    value = amount,
                    onValueChange = { currencyViewModel.onAmountChanged(it) },
                    label = { Text("Enter amount") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(16.dp))

                // From / Swap / To row
                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    CurrencyDropdown(
                        label = "From",
                        selected = fromCurrency,
                        options = currencies,
                        onSelected = { currencyViewModel.onFromCurrencyChanged(it) },
                        modifier = Modifier.weight(1f)
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    // Swap button
                    OutlinedButton(onClick = { currencyViewModel.swapCurrencies() }) {
                        Icon(imageVector = Icons.Default.SwapHoriz, contentDescription = "Swap")
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    CurrencyDropdown(
                        label = "To",
                        selected = toCurrency,
                        options = currencies,
                        onSelected = { currencyViewModel.onToCurrencyChanged(it) },
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Convert / Loading
                Button(
                    onClick = { currencyViewModel.convert() },
                    modifier = Modifier
                        .fillMaxWidth()
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(modifier = Modifier.height(18.dp), strokeWidth = 2.dp)
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("Converting...")
                    } else {
                        Text("Convert")
                    }
                }

                // Error text
                if (!error.isNullOrEmpty()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = error ?: "",
                        color = MaterialTheme.colorScheme.error
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                val convertedText by currencyViewModel.convertedText.collectAsState()

// Result card
                AnimatedVisibility(
                    visible = convertedText.isNotEmpty(),
                    enter = fadeIn(),
                    exit = fadeOut()
                ) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        elevation = CardDefaults.cardElevation(8.dp)
                    ) {
                        Text(
                            text = convertedText,
                            style = MaterialTheme.typography.titleMedium,
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                }

            }
        }
    }
}

/**
 * Slightly improved dropdown — accepts modifier so it can be used in a row with weight()
 */
@Composable
fun CurrencyDropdown(
    label: String,
    selected: String,
    options: List<String>,
    onSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }

    Box(modifier = modifier) {
        OutlinedButton(
            onClick = { expanded = true },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("$label: $selected")
        }
        androidx.compose.material3.DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            options.forEach { option ->
                androidx.compose.material3.DropdownMenuItem(
                    text = { Text(option) },
                    onClick = {
                        onSelected(option)
                        expanded = false
                    }
                )
            }
        }
    }
}

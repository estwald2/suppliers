// --- CONFIGURAZIONE ---
const SUPABASE_URL = 'https://akgfyvmnlqzwjqvctxhw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrZ2Z5dm1ubHF6d2pxdmN0eGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MDI3NjAsImV4cCI6MjA2ODA3ODc2MH0.WJoBXPp_ApIfTMr0zzdMlCKnmDZSSBD5RxJ7w8pFzgs';

// --- INIZIALIZZAZIONE ---
const supabase = supabase_js.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- ELEMENTI DEL DOM ---
const loginSection = document.getElementById('login-section');
const searchSection = document.getElementById('search-section');
const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginError = document.getElementById('login-error');
const logoutButton = document.getElementById('logout-button');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const resultsContainer = document.getElementById('results-container');
const loadingSpinner = document.getElementById('loading-spinner');

// --- GESTIONE AUTENTICAZIONE ---

// Funzione per aggiornare l'interfaccia in base allo stato di login
function updateUI(user) {
    if (user) {
        // Utente loggato: mostra la ricerca, nascondi il login
        loginSection.classList.add('hidden');
        searchSection.classList.remove('hidden');
    } else {
        // Utente non loggato: mostra il login, nascondi la ricerca
        loginSection.classList.remove('hidden');
        searchSection.classList.add('hidden');
    }
}

// Listener per il form di login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Impedisce il ricaricamento della pagina
    loginError.classList.add('hidden'); // Nasconde errori precedenti

    const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.value,
        password: loginPassword.value,
    });

    if (error) {
        loginError.textContent = `Errore: ${error.message}`;
        loginError.classList.remove('hidden');
    }
    // Non c'è bisogno di fare altro, il listener onAuthStateChange si occuperà di aggiornare l'UI
});

// Listener per il logout
logoutButton.addEventListener('click', async () => {
    await supabase.auth.signOut();
    // il listener onAuthStateChange si occuperà di aggiornare l'UI
});

// Listener principale che reagisce ai cambi di stato (login, logout, refresh pagina)
supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user;
    updateUI(user);
});


// --- FUNZIONI DI RICERCA (invariate, ma ora funzionano solo se loggati) ---

async function performSearch() {
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        resultsContainer.innerHTML = '<p>Inserisci un termine di ricerca.</p>';
        return;
    }
    loadingSpinner.classList.remove('hidden');
    resultsContainer.innerHTML = '';

    try {
        const { data, error } = await supabase
            .from('prodotti')
            .select('*')
            .ilike('keywords', `%${searchTerm}%`);

        if (error) throw error;
        displayResults(data);

    } catch (error) {
        // Questo errore apparirà se si prova a cercare senza essere l'admin
        resultsContainer.innerHTML = `<p style="color: red;">Errore: ${error.message}</p>`;
        console.error('Errore Supabase:', error);
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

function displayResults(products) {
    if (!products || products.length === 0) {
        resultsContainer.innerHTML = '<p>Nessun prodotto trovato.</p>';
        return;
    }
    resultsContainer.innerHTML = ''; // Pulisci i risultati precedenti
    products.forEach(product => {
        let listinoHtml = `...`; // La logica per creare la tabella listino è la stessa di prima
        listinoHtml = `<table class="listino-table"><thead><tr><th>ID Item</th><th>Dimensione</th><th>Prezzo Netto</th></tr></thead><tbody>`;
        product.listino.forEach(item => {
            listinoHtml += `<tr><td>${item.id_item}</td><td>${item.dimensione}</td><td>€ ${item.prezzo_netto.toFixed(2)}</td></tr>`;
        });
        listinoHtml += '</tbody></table>';

        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `<h2>${product.nome_generico}</h2><p><strong>Produttore:</strong> ${product.produttore}</p><p><strong>Fornitore:</strong> ${product.fornitore_nome} (<a href="mailto:${product.fornitore_email}">${product.fornitore_email}</a>)</p><h3>Listino:</h3>${listinoHtml}`;
        resultsContainer.appendChild(productCard);
    });
}

searchButton.addEventListener('click', performSearch);
searchInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') performSearch();
});

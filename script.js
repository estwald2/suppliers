// --- CONFIGURAZIONE ---
const SUPABASE_URL = 'https://akgfyvmnlqzwjqvctxhw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrZ2Z5dm1ubHF6d2pxdmN0eGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MDI3NjAsImV4cCI6MjA2ODA3ODc2MH0.WJoBXPp_ApIfTMr0zzdMlCKnmDZSSBD5RxJ7w8pFzgs';

// --- INIZIALIZZAZIONE ---
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// --- MODIFICA PER LIVE SEARCH: Variabile per il timer di debounce ---
let debounceTimer;

// --- GESTIONE AUTENTICAZIONE (invariata) ---

function updateUI(user) {
    if (user) {
        loginSection.classList.add('hidden');
        searchSection.classList.remove('hidden');
    } else {
        loginSection.classList.remove('hidden');
        searchSection.classList.add('hidden');
    }
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: loginEmail.value,
        password: loginPassword.value,
    });

    if (error) {
        loginError.textContent = `Errore: ${error.message}`;
        loginError.classList.remove('hidden');
    }
});

logoutButton.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
});

supabaseClient.auth.onAuthStateChange((event, session) => {
    const user = session?.user;
    updateUI(user);
});


// --- FUNZIONI DI RICERCA (leggermente modificate) ---

async function performSearch() {
    const searchTerm = searchInput.value.trim();
    
    // MODIFICA: Non cercare se il campo è troppo corto o vuoto, pulisci i risultati
    if (searchTerm.length < 2) {
        resultsContainer.innerHTML = '';
        loadingSpinner.classList.add('hidden');
        return;
    }

    loadingSpinner.classList.remove('hidden');
    // Non pulire i risultati qui, per un'esperienza più fluida
    // resultsContainer.innerHTML = ''; 

    try {
        const { data, error } = await supabaseClient
            .from('prodotti')
            .select('*')
            .ilike('keywords', `%${searchTerm}%`);

        if (error) throw error;
        displayResults(data);

    } catch (error) {
        resultsContainer.innerHTML = `<p style="color: red;">Errore: ${error.message}</p>`;
        console.error('Errore Supabase:', error);
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

function displayResults(products) {
    // Prima di mostrare i nuovi risultati, pulisci i vecchi
    resultsContainer.innerHTML = '';

    if (!products || products.length === 0) {
        resultsContainer.innerHTML = '<p>Nessun prodotto trovato.</p>';
        return;
    }
    
    products.forEach(product => {
        let listinoHtml = `<table class="listino-table"><thead><tr><th>ID Item</th><th>Dimensione</th><th>Prezzo Netto</th></tr></thead><tbody>`;
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

// --- MODIFICA: Gestione Eventi per Live Search ---

// Il pulsante "Cerca" ora lancia subito la ricerca, senza debounce
searchButton.addEventListener('click', performSearch);

// L'evento 'input' sulla barra di ricerca attiva la ricerca con debounce
searchInput.addEventListener('input', () => {
    // 1. Cancella il timer precedente ogni volta che l'utente digita
    clearTimeout(debounceTimer);
    
    // 2. Imposta un nuovo timer
    debounceTimer = setTimeout(() => {
        performSearch();
    }, 400); // 400 millisecondi di attesa prima di lanciare la ricerca
});

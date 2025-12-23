const firebaseConfig = {
  apiKey: "AIzaSyDclckQnSOOCiYt6d8H4BLy9fuuF-nUwV8",
  authDomain: "haryanasandhyatimes-fb72f.firebaseapp.com",
  projectId: "haryanasandhyatimes-fb72f",
  storageBucket: "haryanasandhyatimes-fb72f.firebasestorage.app",
  messagingSenderId: "94477299526",
  appId: "1:94477299526:web:bed36e6c101f0d9059ff47",
  measurementId: "G-1JECMXTWXD"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let quill;
let cropper;
let currentImageFile = null;
let croppedImageBlob = null;
let existingAdditionalImages = [];

// Automatic icon mapping based on genre name
function getGenreIcon(genreName) {
    if (!genreName) return 'fas fa-newspaper';
    
    const genreLower = genreName.toLowerCase().trim();
    const iconMap = {
        // News & Current Affairs
        'news': 'fas fa-newspaper',
        'current affairs': 'fas fa-globe',
        'breaking news': 'fas fa-bullhorn',
        'latest news': 'fas fa-clock',
        
        // Politics
        'politics': 'fas fa-landmark',
        'political': 'fas fa-landmark',
        'election': 'fas fa-vote-yea',
        'government': 'fas fa-building',
        
        // Sports
        'sports': 'fas fa-football-ball',
        'cricket': 'fas fa-baseball-ball',
        'football': 'fas fa-futbol',
        'hockey': 'fas fa-hockey-puck',
        'tennis': 'fas fa-table-tennis',
        
        // Entertainment
        'entertainment': 'fas fa-film',
        'movies': 'fas fa-film',
        'bollywood': 'fas fa-theater-masks',
        'music': 'fas fa-music',
        'tv': 'fas fa-tv',
        'television': 'fas fa-tv',
        
        // Business & Economy
        'business': 'fas fa-briefcase',
        'economy': 'fas fa-chart-line',
        'finance': 'fas fa-money-bill-wave',
        'stock market': 'fas fa-chart-bar',
        
        // Technology
        'technology': 'fas fa-laptop',
        'tech': 'fas fa-microchip',
        'science': 'fas fa-flask',
        'innovation': 'fas fa-lightbulb',
        
        // Health & Lifestyle
        'health': 'fas fa-heartbeat',
        'fitness': 'fas fa-dumbbell',
        'lifestyle': 'fas fa-spa',
        'fashion': 'fas fa-tshirt',
        'food': 'fas fa-utensils',
        
        // Education
        'education': 'fas fa-graduation-cap',
        'school': 'fas fa-school',
        'university': 'fas fa-university',
        
        // Crime & Legal
        'crime': 'fas fa-gavel',
        'legal': 'fas fa-balance-scale',
        'court': 'fas fa-gavel',
        
        // Weather & Nature
        'weather': 'fas fa-cloud-sun',
        'environment': 'fas fa-leaf',
        'nature': 'fas fa-tree',
        
        // Local & Regional
        'local': 'fas fa-map-marker-alt',
        'city': 'fas fa-city',
        'haryana': 'fas fa-map-marker-alt',
        
        // Culture & Society
        'culture': 'fas fa-monument',
        'society': 'fas fa-users',
        'festival': 'fas fa-masks-theater',
        'tradition': 'fas fa-torii-gate',
        
        // Agriculture
        'agriculture': 'fas fa-tractor',
        'farming': 'fas fa-seedling',
        
        // Transport
        'transport': 'fas fa-bus',
        'traffic': 'fas fa-car',
        
        // Default
        'default': 'fas fa-newspaper'
    };
    
    // Try exact match first
    if (iconMap[genreLower]) {
        return iconMap[genreLower];
    }
    
    // Try partial match
    for (const [key, icon] of Object.entries(iconMap)) {
        if (genreLower.includes(key) || key.includes(genreLower)) {
            return icon;
        }
    }
    
    // Return default icon
    return iconMap.default;
}

function showSection(sectionName) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelectorAll('.menu-link').forEach(link => {
        link.classList.remove('active');
    });
    
    document.getElementById(`${sectionName}Section`).classList.add('active');
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
    
    if (sectionName === 'articles') {
        loadArticles();
    } else if (sectionName === 'drafts') {
        loadDrafts();
    } else if (sectionName === 'genres') {
        loadGenres();
    } else if (sectionName === 'reporters') {
        loadReporterApplications();
    } else if (sectionName === 'settings') {
        loadSettings();
    } else if (sectionName === 'dashboard') {
        loadDashboard();
    } else if (sectionName === 'newArticle') {
        // Only reset form if starting fresh (both editMode and articleId are empty)
        // Don't reset if we're in edit mode (editArticle sets both before calling showSection)
        const editMode = document.getElementById('editMode').value;
        const articleId = document.getElementById('articleId').value;
        if (!editMode && !articleId) {
            resetArticleForm();
        }
    } else if (sectionName === 'liveNews') {
        loadLiveNews();
    } else if (sectionName === 'viewsLikes') {
        loadViewsLikes();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('adminSection').style.display = 'block';
        loadDashboard();
        loadGenresForSelect();
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

async function handleLogout() {
    try {
        await auth.signOut();
        document.getElementById('loginSection').style.display = 'flex';
        document.getElementById('adminSection').style.display = 'none';
    } catch (error) {
        alert('Logout failed: ' + error.message);
    }
}

auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('adminSection').style.display = 'block';
        loadDashboard();
        loadGenresForSelect();
    } else {
        document.getElementById('loginSection').style.display = 'flex';
        document.getElementById('adminSection').style.display = 'none';
    }
});

async function loadDashboard() {
    try {
        const articlesSnapshot = await db.collection('articles').where('status', '==', 'published').get();
        document.getElementById('totalArticles').textContent = articlesSnapshot.size;
        
        const draftsSnapshot = await db.collection('articles').where('status', '==', 'draft').get();
        document.getElementById('totalDrafts').textContent = draftsSnapshot.size;
        
        const applicationsSnapshot = await db.collection('reporterApplications').get();
        document.getElementById('totalApplications').textContent = applicationsSnapshot.size;
        
        const genresSnapshot = await db.collection('genres').get();
        document.getElementById('totalGenres').textContent = genresSnapshot.size;
        
        // Load total website visits (calculate from date-wise data)
        const statsDoc = await db.collection('stats').doc('website').get();
        if (statsDoc.exists) {
            const stats = statsDoc.data();
            const dailyVisits = stats.dailyVisits || {};
            
            // Calculate total from all dates
            let totalVisits = 0;
            Object.values(dailyVisits).forEach(count => {
                totalVisits += count;
            });
            
            document.getElementById('totalVisits').textContent = totalVisits.toLocaleString();
        } else {
            document.getElementById('totalVisits').textContent = '0';
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function uploadFile(file, path) {
    const storageRef = storage.ref();
    const fileRef = storageRef.child(`${path}/${Date.now()}_${file.name}`);
    await fileRef.put(file);
    return await fileRef.getDownloadURL();
}

function handleImageSelect(e) {
    const file = e.target.files[0];
    if (file) {
        currentImageFile = file;
        const reader = new FileReader();
        reader.onload = function(event) {
            document.getElementById('previewImg').src = event.target.result;
            document.getElementById('imagePreview').style.display = 'flex';
            document.getElementById('cropBtn').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function openCropModal() {
    const modal = document.getElementById('cropModal');
    const cropImage = document.getElementById('cropImage');
    cropImage.src = document.getElementById('previewImg').src;
    modal.classList.add('active');
    
    if (cropper) {
        cropper.destroy();
    }
    
    cropper = new Cropper(cropImage, {
        aspectRatio: 16 / 9,
        viewMode: 1,
        responsive: true,
        background: false,
    });
}

function closeCropModal() {
    document.getElementById('cropModal').classList.remove('active');
    if (cropper) {
        cropper.destroy();
    }
}

async function applyCrop() {
    const canvas = cropper.getCroppedCanvas();
    canvas.toBlob(blob => {
        croppedImageBlob = blob;
        const url = URL.createObjectURL(blob);
        document.getElementById('previewImg').src = url;
        closeCropModal();
    });
}

async function handleArticleSubmit(e, isDraft = false) {
    e.preventDefault();
    
    const title = document.getElementById('articleTitle').value;
    const tagline = document.getElementById('articleTagline').value;
    const genre = document.getElementById('articleGenre').value;
    const location = document.getElementById('articleLocation').value;
    const reporter = document.getElementById('articleReporter').value;
    const content = quill.root.innerHTML;
    const articleId = document.getElementById('articleId').value;
    const editMode = document.getElementById('editMode').value;
    
    if (!title || !genre || !content) {
        alert('Please fill all required fields (Title, Genre, and Content)');
        return;
    }
    
    try {
        let imageUrl = '';
        let additionalImages = [...existingAdditionalImages]; // Use the tracked existing images
        let existingData = null;
        
        // Get existing data if in edit mode (fetch once to reuse)
        if (editMode && articleId) {
            const existingDoc = await db.collection('articles').doc(articleId).get();
            if (!existingDoc.exists) {
                alert('Article not found!');
                return;
            }
            existingData = existingDoc.data();
            imageUrl = existingData.imageUrl || '';
            // Make sure we have the latest existing additional images
            additionalImages = existingData.additionalImages || [];
        }
        
        // Upload new cropped image if exists
        if (croppedImageBlob) {
            const fileName = `articles/${Date.now()}_${currentImageFile.name}`;
            const storageRef = storage.ref();
            const fileRef = storageRef.child(fileName);
            await fileRef.put(croppedImageBlob);
            imageUrl = await fileRef.getDownloadURL();
        } 
        // Upload new image without crop if exists
        else if (currentImageFile && !croppedImageBlob) {
            imageUrl = await uploadFile(currentImageFile, 'articles');
        }
        
        // If editing and no new image selected, preserve existing image
        if (editMode && existingData && existingData.imageUrl && !imageUrl) {
            imageUrl = existingData.imageUrl;
        }
        
        // Image is optional - allow empty imageUrl
        
        // Upload NEW additional images if any (append to existing)
        const additionalImageFiles = document.getElementById('additionalImages').files;
        if (additionalImageFiles.length > 0) {
            for (let file of additionalImageFiles) {
                const url = await uploadFile(file, 'articles');
                additionalImages.push(url);
            }
        }
        
        const articleData = {
            title,
            tagline: tagline || '',
            genre,
            location: location || '',
            reporter: reporter || '',
            content,
            imageUrl: imageUrl || '',
            additionalImages,
            status: isDraft ? 'draft' : 'published',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (editMode && articleId && existingData) {
            // Editing existing article - preserve createdAt and publishedDate
            // Preserve createdAt if it exists (important for drafts)
            if (existingData.createdAt) {
                articleData.createdAt = existingData.createdAt;
            }
            
            // Preserve publishedDate if it exists (for published articles)
            if (existingData.publishedDate) {
                articleData.publishedDate = existingData.publishedDate;
            }
            
            // Preserve views and likes if they exist, otherwise set defaults
            if (existingData.views !== undefined) {
                articleData.views = existingData.views;
            } else {
                articleData.views = 0;
            }
            if (existingData.likes !== undefined) {
                articleData.likes = existingData.likes;
            } else {
                articleData.likes = 0;
            }
            
            await db.collection('articles').doc(articleId).update(articleData);
            alert('Article updated successfully!');
            // Reload drafts after update
            loadDrafts();
        } else {
            // Creating new article - initialize views and likes to 0
            articleData.views = 0;
            articleData.likes = 0;
            articleData.publishedDate = firebase.firestore.FieldValue.serverTimestamp();
            articleData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('articles').add(articleData);
            alert(isDraft ? 'Article saved as draft!' : 'Article published successfully!');
        }
        
        resetArticleForm();
        loadDashboard();
        
    } catch (error) {
        console.error('Error saving article:', error);
        alert('Error saving article: ' + error.message);
    }
}

function resetArticleForm() {
    document.getElementById('articleForm').reset();
    document.getElementById('articleId').value = '';
    document.getElementById('editMode').value = '';
    quill.setContents([]);
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('cropBtn').style.display = 'none';
    document.getElementById('additionalImagesPreview').innerHTML = '';
    document.getElementById('taglineCount').textContent = '0';
    currentImageFile = null;
    croppedImageBlob = null;
    existingAdditionalImages = [];
}

async function loadArticles() {
    try {
        const articlesSnapshot = await db.collection('articles')
            .where('status', '==', 'published')
            .get();
        
        // Convert to array and sort manually
        const articles = [];
        articlesSnapshot.forEach(doc => {
            articles.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by publishedDate descending
        articles.sort((a, b) => {
            const aTime = a.publishedDate ? a.publishedDate.toMillis() : 0;
            const bTime = b.publishedDate ? b.publishedDate.toMillis() : 0;
            return bTime - aTime;
        });
        
        const tbody = document.getElementById('articlesTableBody');
        tbody.innerHTML = '';
        
        articles.forEach(article => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${article.title}</td>
                <td>${article.genre}</td>
                <td>${formatDate(article.publishedDate)}</td>
                <td>${formatDate(article.updatedAt)}</td>
                <td>
                    <button class="action-btn edit" onclick="editArticle('${article.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteArticle('${article.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        if (articles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #666;">No articles found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading articles:', error);
    }
}

async function loadDrafts() {
    try {
        const draftsSnapshot = await db.collection('articles')
            .where('status', '==', 'draft')
            .get();
        
        const tbody = document.getElementById('draftsTableBody');
        tbody.innerHTML = '';
        
        // Convert to array and sort manually
        const drafts = [];
        draftsSnapshot.forEach(doc => {
            drafts.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by createdAt descending
        drafts.sort((a, b) => {
            const aTime = a.createdAt ? a.createdAt.toMillis() : 0;
            const bTime = b.createdAt ? b.createdAt.toMillis() : 0;
            return bTime - aTime;
        });
        
        drafts.forEach(article => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${article.title}</td>
                <td>${article.genre}</td>
                <td>${formatDate(article.createdAt)}</td>
                <td>${formatDate(article.updatedAt)}</td>
                <td>
                    <button class="action-btn edit" onclick="editArticle('${article.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteArticle('${article.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        if (drafts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #666;">No drafts found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading drafts:', error);
    }
}

async function editArticle(articleId) {
    try {
        const doc = await db.collection('articles').doc(articleId).get();
        if (!doc.exists) return;
        
        const article = doc.data();
        
        document.getElementById('articleId').value = articleId;
        document.getElementById('editMode').value = 'true';
        document.getElementById('articleTitle').value = article.title;
        document.getElementById('articleTagline').value = article.tagline;
        document.getElementById('taglineCount').textContent = article.tagline.length;
        document.getElementById('articleGenre').value = article.genre;
        document.getElementById('articleLocation').value = article.location || '';
        document.getElementById('articleReporter').value = article.reporter || '';
        quill.root.innerHTML = article.content;
        
        if (article.imageUrl) {
            document.getElementById('previewImg').src = article.imageUrl;
            document.getElementById('imagePreview').style.display = 'flex';
            document.getElementById('cropBtn').style.display = 'none';
            currentImageFile = null;
            croppedImageBlob = null;
        }
        
        // Display additional images
        const previewContainer = document.getElementById('additionalImagesPreview');
        previewContainer.innerHTML = '';
        if (article.additionalImages && article.additionalImages.length > 0) {
            existingAdditionalImages = [...article.additionalImages];
            article.additionalImages.forEach((url, index) => {
                const div = document.createElement('div');
                div.className = 'additional-image-item';
                div.innerHTML = `
                    <img src="${url}" alt="Additional ${index + 1}">
                    <button type="button" class="remove-additional-image" onclick="removeAdditionalImage(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                previewContainer.appendChild(div);
            });
        } else {
            existingAdditionalImages = [];
        }
        
        // Reset file inputs so they don't interfere
        document.getElementById('articleImage').value = '';
        document.getElementById('additionalImages').value = '';
        
        showSection('newArticle');
        window.scrollTo(0, 0);
    } catch (error) {
        console.error('Error loading article:', error);
    }
}

async function deleteArticle(articleId) {
    if (!confirm('Are you sure you want to delete this article?')) return;
    
    try {
        await db.collection('articles').doc(articleId).delete();
        alert('Article deleted successfully!');
        loadArticles();
        loadDrafts();
        loadDashboard();
    } catch (error) {
        console.error('Error deleting article:', error);
        alert('Error deleting article');
    }
}

async function removeAdditionalImage(index) {
    const articleId = document.getElementById('articleId').value;
    if (!articleId) {
        // If not editing, just remove from preview
        existingAdditionalImages.splice(index, 1);
        const previewContainer = document.getElementById('additionalImagesPreview');
        previewContainer.children[index].remove();
        return;
    }
    
    try {
        const doc = await db.collection('articles').doc(articleId).get();
        const article = doc.data();
        const additionalImages = article.additionalImages || [];
        
        additionalImages.splice(index, 1);
        
        await db.collection('articles').doc(articleId).update({
            additionalImages
        });
        
        // Reload the article to refresh the preview
        editArticle(articleId);
    } catch (error) {
        console.error('Error removing image:', error);
        alert('Error removing image');
    }
}

async function loadGenresForSelect() {
    try {
        const genresSnapshot = await db.collection('genres').get();
        const select = document.getElementById('articleGenre');
        select.innerHTML = '<option value="">Select Genre</option>';
        
        genresSnapshot.forEach(doc => {
            const genre = doc.data();
            const option = document.createElement('option');
            option.value = genre.name;
            option.textContent = genre.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading genres:', error);
    }
}

async function loadGenres() {
    try {
        const genresSnapshot = await db.collection('genres').get();
        const container = document.getElementById('genresList');
        container.innerHTML = '';
        
        genresSnapshot.forEach(doc => {
            const genre = doc.data();
            const div = document.createElement('div');
            div.className = 'genre-item';
            // Use saved icon if available, otherwise auto-assign
            const icon = genre.icon || getGenreIcon(genre.name);
            
            div.innerHTML = `
                <div class="genre-info">
                    <i class="${icon}"></i>
                    <span>${genre.name}</span>
                </div>
                <div class="genre-actions" style="display: flex; gap: 5px;">
                    <button class="action-btn edit" data-genre-id="${doc.id}" data-genre-name="${genre.name}" data-genre-icon="${icon}" title="Edit Icon">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" data-genre-id="${doc.id}" title="Delete Genre">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            // Add event listeners
            const editBtn = div.querySelector('.action-btn.edit');
            const deleteBtn = div.querySelector('.action-btn.delete');
            
            editBtn.addEventListener('click', () => {
                editGenre(doc.id, genre.name, icon);
            });
            
            deleteBtn.addEventListener('click', () => {
                deleteGenre(doc.id);
            });
            
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading genres:', error);
    }
}

// Common Font Awesome icons for genre selection
const commonIcons = [
    'fas fa-newspaper', 'fas fa-globe', 'fas fa-bullhorn', 'fas fa-clock',
    'fas fa-landmark', 'fas fa-vote-yea', 'fas fa-building',
    'fas fa-football-ball', 'fas fa-baseball-ball', 'fas fa-futbol', 'fas fa-hockey-puck', 'fas fa-table-tennis',
    'fas fa-film', 'fas fa-theater-masks', 'fas fa-music', 'fas fa-tv',
    'fas fa-briefcase', 'fas fa-chart-line', 'fas fa-money-bill-wave', 'fas fa-chart-bar',
    'fas fa-laptop', 'fas fa-microchip', 'fas fa-flask', 'fas fa-lightbulb',
    'fas fa-heartbeat', 'fas fa-dumbbell', 'fas fa-spa', 'fas fa-tshirt', 'fas fa-utensils',
    'fas fa-graduation-cap', 'fas fa-school', 'fas fa-university',
    'fas fa-gavel', 'fas fa-balance-scale',
    'fas fa-cloud-sun', 'fas fa-leaf', 'fas fa-tree',
    'fas fa-map-marker-alt', 'fas fa-city',
    'fas fa-monument', 'fas fa-users', 'fas fa-masks-theater', 'fas fa-torii-gate',
    'fas fa-tractor', 'fas fa-seedling',
    'fas fa-bus', 'fas fa-car',
    'fas fa-book', 'fas fa-pen', 'fas fa-camera', 'fas fa-video', 'fas fa-microphone',
    'fas fa-gamepad', 'fas fa-puzzle-piece', 'fas fa-star', 'fas fa-trophy',
    'fas fa-shield-alt', 'fas fa-fire', 'fas fa-bolt', 'fas fa-gem'
];

// Initialize icon selector
function initializeIconSelector(containerId = 'iconGrid') {
    const iconGrid = document.getElementById(containerId);
    if (!iconGrid) return;
    
    iconGrid.innerHTML = '';
    commonIcons.forEach(icon => {
        const iconDiv = document.createElement('div');
        iconDiv.className = 'icon-option';
        iconDiv.innerHTML = `<i class="${icon}"></i>`;
        iconDiv.setAttribute('data-icon', icon);
        iconGrid.appendChild(iconDiv);
    });
}

function toggleIconSelector(selectorElement = null) {
    const selector = selectorElement || document.getElementById('iconSelector');
    if (!selector) return;
    
    const iconGrid = selector.querySelector('.icon-grid') || selector.querySelector('#iconGrid');
    if (!iconGrid) return;
    
    if (selector.style.display === 'none' || !selector.style.display) {
        selector.style.display = 'block';
        if (!iconGrid.innerHTML) {
            initializeIconSelector(iconGrid.id || 'iconGrid');
        }
    } else {
        selector.style.display = 'none';
    }
}

function selectIcon(icon, wrapperElement) {
    if (!wrapperElement) return;
    
    const targetInput = wrapperElement.querySelector('input[type="hidden"]');
    const targetPreview = wrapperElement.querySelector('.icon-preview');
    const targetPreviewIcon = wrapperElement.querySelector('.icon-preview i');
    const selector = wrapperElement.querySelector('.icon-selector');
    
    if (targetInput) {
        targetInput.value = icon;
        if (targetPreview && targetPreviewIcon) {
            targetPreviewIcon.className = icon;
            targetPreview.style.display = 'inline-block';
        }
    }
    if (selector) {
        selector.style.display = 'none';
    }
}

function filterIcons(searchInput) {
    if (!searchInput) return;
    const searchTerm = searchInput.value.toLowerCase();
    const iconSelector = searchInput.closest('.icon-selector');
    if (!iconSelector) return;
    
    const iconGrid = iconSelector.querySelector('.icon-grid') || iconSelector.querySelector('#iconGrid');
    if (!iconGrid) return;
    
    const iconOptions = iconGrid.querySelectorAll('.icon-option');
    iconOptions.forEach(option => {
        const icon = option.getAttribute('data-icon');
        if (icon && icon.toLowerCase().includes(searchTerm)) {
            option.style.display = 'block';
        } else {
            option.style.display = 'none';
        }
    });
}

async function handleGenreSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('genreName').value;
    const icon = document.getElementById('selectedIcon').value || getGenreIcon(name); // Use selected icon or auto-assign
    
    try {
        await db.collection('genres').add({ name, icon });
        alert('Genre added successfully!');
        document.getElementById('genreForm').reset();
        document.getElementById('iconPreview').style.display = 'none';
        document.getElementById('selectedIcon').value = '';
        loadGenres();
        loadGenresForSelect();
        loadDashboard();
    } catch (error) {
        console.error('Error adding genre:', error);
        alert('Error adding genre');
    }
}

async function editGenre(genreId, genreName, currentIcon) {
    // Show icon selector modal directly
    showIconSelectorModal(genreId, genreName, currentIcon);
}

function showIconSelectorModal(genreId, genreName, currentIcon) {
    // Create a modal for icon selection
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'genreIconModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3>Select Icon for "${genreName}"</h3>
                <button class="modal-close" id="closeGenreIconModalBtn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="icon-selector-wrapper" style="position: relative;">
                    <div class="current-icon-preview" style="margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center;">
                        <p style="margin: 0 0 10px 0; color: #666;">Current Icon:</p>
                        <i class="${currentIcon}" id="currentIconPreview" style="font-size: 2rem; color: var(--primary-color);"></i>
                    </div>
                    <div class="icon-selector" style="position: relative; display: block;">
                        <div class="icon-selector-header">
                            <input type="text" id="modalIconSearch" placeholder="Search icons..." style="flex: 1; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 6px;">
                            <button type="button" class="icon-selector-close" id="closeGenreIconModalBtn2">&times;</button>
                        </div>
                        <div class="icon-grid" id="modalIconGrid"></div>
                    </div>
                    <input type="hidden" id="modalSelectedIcon" value="${currentIcon}">
                </div>
                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn-secondary" id="cancelGenreIconBtn">Cancel</button>
                    <button class="btn-primary" id="saveGenreIconBtn">Save Icon</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Initialize icon grid
    initializeIconSelector('modalIconGrid');
    
    // Setup icon selection
    const iconGrid = document.getElementById('modalIconGrid');
    iconGrid.addEventListener('click', (e) => {
        const iconOption = e.target.closest('.icon-option');
        if (iconOption) {
            const icon = iconOption.getAttribute('data-icon');
            document.getElementById('modalSelectedIcon').value = icon;
            
            // Update preview
            const preview = document.getElementById('currentIconPreview');
            if (preview) {
                preview.className = icon;
            }
            
            // Highlight selected
            iconGrid.querySelectorAll('.icon-option').forEach(opt => {
                opt.style.borderColor = 'var(--border-color)';
                opt.style.background = '';
            });
            iconOption.style.borderColor = 'var(--primary-color)';
            iconOption.style.background = 'rgba(255, 15, 34, 0.1)';
        }
    });
    
    // Setup search
    const searchInput = document.getElementById('modalIconSearch');
    searchInput.addEventListener('input', (e) => {
        filterIcons(e.target);
    });
    
    // Setup close buttons
    document.getElementById('closeGenreIconModalBtn').addEventListener('click', closeGenreIconModal);
    document.getElementById('closeGenreIconModalBtn2').addEventListener('click', closeGenreIconModal);
    document.getElementById('cancelGenreIconBtn').addEventListener('click', closeGenreIconModal);
    
    // Setup save button
    document.getElementById('saveGenreIconBtn').addEventListener('click', () => {
        saveGenreIcon(genreId);
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeGenreIconModal();
        }
    });
    
    // Highlight current icon
    setTimeout(() => {
        const currentOption = iconGrid.querySelector(`[data-icon="${currentIcon}"]`);
        if (currentOption) {
            currentOption.style.borderColor = 'var(--primary-color)';
            currentOption.style.background = 'rgba(255, 15, 34, 0.1)';
        }
    }, 100);
}

async function saveGenreIcon(genreId) {
    const selectedIcon = document.getElementById('modalSelectedIcon').value;
    if (!selectedIcon) {
        alert('Please select an icon');
        return;
    }
    
    try {
        await db.collection('genres').doc(genreId).update({
            icon: selectedIcon
        });
        alert('Genre icon updated successfully!');
        closeGenreIconModal();
        loadGenres();
        loadGenresForSelect();
    } catch (error) {
        console.error('Error updating genre icon:', error);
        alert('Error updating genre icon');
    }
}

function closeGenreIconModal() {
    const modal = document.getElementById('genreIconModal');
    if (modal) {
        modal.remove();
    }
}

async function deleteGenre(genreId) {
    if (!confirm('Are you sure you want to delete this genre?')) return;
    
    try {
        await db.collection('genres').doc(genreId).delete();
        alert('Genre deleted successfully!');
        loadGenres();
        loadGenresForSelect();
        loadDashboard();
    } catch (error) {
        console.error('Error deleting genre:', error);
        alert('Error deleting genre');
    }
}

async function loadReporterApplications() {
    try {
        const applicationsSnapshot = await db.collection('reporterApplications').get();
        
        // Convert to array and sort manually
        const applications = [];
        applicationsSnapshot.forEach(doc => {
            applications.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by submittedAt descending
        applications.sort((a, b) => {
            const aTime = a.submittedAt ? a.submittedAt.toMillis() : 0;
            const bTime = b.submittedAt ? b.submittedAt.toMillis() : 0;
            return bTime - aTime;
        });
        
        const tbody = document.getElementById('reportersTableBody');
        tbody.innerHTML = '';
        
        applications.forEach(app => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${app.name}</td>
                <td>${app.email}</td>
                <td>${app.mobile}</td>
                <td>${app.district}</td>
                <td><span class="status-badge ${app.status}">${app.status || 'pending'}</span></td>
                <td>
                    <button class="action-btn view" onclick="viewApplication('${app.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteApplication('${app.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        if (applications.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #666;">No applications found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading applications:', error);
    }
}

async function viewApplication(appId) {
    try {
        const doc = await db.collection('reporterApplications').doc(appId).get();
        if (!doc.exists) return;
        
        const app = doc.data();
        const modal = document.getElementById('viewModal');
        const modalBody = document.getElementById('modalBody');
        
        modalBody.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                <div><strong>Name:</strong> ${app.name}</div>
                <div><strong>Gender:</strong> ${app.gender}</div>
                <div><strong>DOB:</strong> ${app.dob}</div>
                <div><strong>Father's Name:</strong> ${app.fatherName}</div>
                <div><strong>Blood Group:</strong> ${app.bloodGroup}</div>
                <div><strong>Aadhar:</strong> ${app.aadhar}</div>
                <div><strong>State:</strong> ${app.state}</div>
                <div><strong>District:</strong> ${app.district}</div>
                <div><strong>Mobile:</strong> ${app.mobile}</div>
                <div><strong>WhatsApp:</strong> ${app.whatsapp}</div>
                <div style="grid-column: 1 / -1;"><strong>Address:</strong> ${app.address}</div>
                <div><strong>Pincode:</strong> ${app.pincode}</div>
                <div><strong>Email:</strong> ${app.email}</div>
                ${app.profilePicUrl ? `<div style="grid-column: 1 / -1;"><strong>Profile:</strong><br><img src="${app.profilePicUrl}" style="max-width: 200px; margin-top: 10px;"></div>` : ''}
                ${app.idProofUrl ? `<div style="grid-column: 1 / -1;"><strong>ID Proof:</strong><br><a href="${app.idProofUrl}" target="_blank">View Document</a></div>` : ''}
            </div>
            <div style="margin-top: 20px; display: flex; gap: 10px;">
                <button class="btn-primary" onclick="updateApplicationStatus('${appId}', 'approved')">Approve</button>
                <button class="btn-secondary" onclick="updateApplicationStatus('${appId}', 'rejected')">Reject</button>
            </div>
        `;
        
        modal.classList.add('active');
    } catch (error) {
        console.error('Error viewing application:', error);
    }
}

async function updateApplicationStatus(appId, status) {
    try {
        await db.collection('reporterApplications').doc(appId).update({ status });
        alert('Status updated successfully!');
        document.getElementById('viewModal').classList.remove('active');
        loadReporterApplications();
        loadDashboard();
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Error updating status');
    }
}

async function deleteApplication(appId) {
    if (!confirm('Are you sure you want to delete this application?')) return;
    
    try {
        await db.collection('reporterApplications').doc(appId).delete();
        alert('Application deleted successfully!');
        loadReporterApplications();
        loadDashboard();
    } catch (error) {
        console.error('Error deleting application:', error);
        alert('Error deleting application');
    }
}

async function loadSettings() {
    try {
        const doc = await db.collection('settings').doc('about').get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('settingsName').value = data.name || '';
            document.getElementById('settingsDescription').value = data.description || '';
            
            if (data.imageUrl) {
                document.getElementById('settingsImagePreview').innerHTML = 
                    `<img src="${data.imageUrl}" style="max-width: 200px; margin-top: 10px;">`;
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function handleSettingsSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('settingsName').value;
    const description = document.getElementById('settingsDescription').value;
    const imageFile = document.getElementById('settingsImage').files[0];
    
    try {
        const settingsData = { name, description };
        
        if (imageFile) {
            settingsData.imageUrl = await uploadFile(imageFile, 'settings');
        }
        
        await db.collection('settings').doc('about').set(settingsData, { merge: true });
        alert('Settings saved successfully!');
        loadSettings();
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Error saving settings');
    }
}

// Live News Functions
async function loadLiveNews() {
    try {
        const liveNewsSnapshot = await db.collection('liveNews')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        const liveNewsList = document.getElementById('liveNewsList');
        liveNewsList.innerHTML = '';
        
        if (liveNewsSnapshot.empty) {
            liveNewsList.innerHTML = '<p class="live-news-empty">No breaking news snippets yet. Add one above!</p>';
            return;
        }
        
        const items = [];
        liveNewsSnapshot.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() });
        });
        
        // Check if we have 5 items and show warning
        if (items.length >= 5) {
            const warning = document.createElement('div');
            warning.className = 'live-news-limit-warning';
            warning.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Maximum limit of 5 breaking news snippets reached. Delete one to add a new one.';
            liveNewsList.appendChild(warning);
        }
        
        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'live-news-item';
            itemDiv.innerHTML = `
                <div class="live-news-content">${item.text}</div>
                <div class="live-news-meta">
                    <div class="live-news-date">${formatDate(item.createdAt)}</div>
                    <button class="live-news-delete" onclick="deleteLiveNews('${item.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;
            liveNewsList.appendChild(itemDiv);
        });
        
    } catch (error) {
        console.error('Error loading live news:', error);
        document.getElementById('liveNewsList').innerHTML = 
            '<p class="live-news-empty">Error loading breaking news snippets.</p>';
    }
}

async function handleLiveNewsSubmit(e) {
    e.preventDefault();
    
    const text = document.getElementById('liveNewsText').value.trim();
    
    if (!text) {
        alert('Please enter a breaking news snippet');
        return;
    }
    
    if (text.length > 300) {
        alert('Breaking news snippet cannot exceed 300 characters');
        return;
    }
    
    try {
        // Check current count
        const currentSnapshot = await db.collection('liveNews').get();
        if (currentSnapshot.size >= 5) {
            alert('Maximum limit of 5 breaking news snippets reached. Please delete one before adding a new one.');
            return;
        }
        
        // Add new snippet
        await db.collection('liveNews').add({
            text: text,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('Breaking news snippet added successfully!');
        document.getElementById('liveNewsForm').reset();
        document.getElementById('liveNewsCharCount').textContent = '0';
        loadLiveNews();
        
    } catch (error) {
        console.error('Error adding live news:', error);
        alert('Error adding breaking news snippet: ' + error.message);
    }
}

async function deleteLiveNews(id) {
    if (!confirm('Are you sure you want to delete this breaking news snippet?')) {
        return;
    }
    
    try {
        await db.collection('liveNews').doc(id).delete();
        alert('Breaking news snippet deleted successfully!');
        loadLiveNews();
    } catch (error) {
        console.error('Error deleting live news:', error);
        alert('Error deleting breaking news snippet: ' + error.message);
    }
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-IN');
}

// Views & Likes Management Functions
async function loadViewsLikes() {
    try {
        const articlesSnapshot = await db.collection('articles')
            .where('status', '==', 'published')
            .get();
        
        // Convert to array and sort manually
        const articles = [];
        articlesSnapshot.forEach(doc => {
            articles.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by publishedDate descending
        articles.sort((a, b) => {
            const aTime = a.publishedDate ? a.publishedDate.toMillis() : 0;
            const bTime = b.publishedDate ? b.publishedDate.toMillis() : 0;
            return bTime - aTime;
        });
        
        const tbody = document.getElementById('viewsLikesTableBody');
        tbody.innerHTML = '';
        
        articles.forEach(article => {
            const views = article.views !== undefined ? article.views : 0;
            const likes = article.likes !== undefined ? article.likes : 0;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${article.title}</td>
                <td>${article.genre}</td>
                <td>
                    <input type="number" 
                           class="editable-number" 
                           value="${views}" 
                           min="0"
                           data-article-id="${article.id}"
                           data-field="views"
                           onchange="updateViewsLikes('${article.id}', 'views', this.value)">
                </td>
                <td>
                    <input type="number" 
                           class="editable-number" 
                           value="${likes}" 
                           min="0"
                           data-article-id="${article.id}"
                           data-field="likes"
                           onchange="updateViewsLikes('${article.id}', 'likes', this.value)">
                </td>
                <td>${formatDate(article.publishedDate)}</td>
                <td>
                    <button class="action-btn edit" onclick="editArticle('${article.id}')" title="Edit Article">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        if (articles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #666;">No articles found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading views and likes:', error);
    }
}

async function updateViewsLikes(articleId, field, value) {
    try {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue) || numValue < 0) {
            alert('Please enter a valid number (0 or greater)');
            // Reload to reset the value
            loadViewsLikes();
            return;
        }
        
        await db.collection('articles').doc(articleId).update({
            [field]: numValue,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Show success feedback (optional - you can remove this if too noisy)
        // console.log(`${field} updated successfully for article ${articleId}`);
    } catch (error) {
        console.error(`Error updating ${field}:`, error);
        alert(`Error updating ${field}: ` + error.message);
        // Reload to reset the value
        loadViewsLikes();
    }
}

async function assignRandomViews() {
    if (!confirm('This will assign random views (100-500) to all articles that don\'t have views set. Continue?')) {
        return;
    }
    
    try {
        const articlesSnapshot = await db.collection('articles')
            .where('status', '==', 'published')
            .get();
        
        const batch = db.batch();
        let count = 0;
        
        articlesSnapshot.forEach(doc => {
            const article = doc.data();
            // Only update articles that don't have views field or have undefined views
            if (article.views === undefined || article.views === null) {
                const randomViews = Math.floor(Math.random() * (500 - 100 + 1)) + 100;
                batch.update(doc.ref, {
                    views: randomViews,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                count++;
            }
        });
        
        if (count > 0) {
            await batch.commit();
            alert(`Random views assigned to ${count} article(s)!`);
            loadViewsLikes();
        } else {
            alert('All articles already have views assigned.');
        }
    } catch (error) {
        console.error('Error assigning random views:', error);
        alert('Error assigning random views: ' + error.message);
    }
}

async function assignRandomLikes() {
    if (!confirm('This will assign random likes (1-100) to all articles that don\'t have likes set. Continue?')) {
        return;
    }
    
    try {
        const articlesSnapshot = await db.collection('articles')
            .where('status', '==', 'published')
            .get();
        
        const batch = db.batch();
        let count = 0;
        
        articlesSnapshot.forEach(doc => {
            const article = doc.data();
            // Only update articles that don't have likes field or have undefined likes
            if (article.likes === undefined || article.likes === null) {
                const randomLikes = Math.floor(Math.random() * (100 - 1 + 1)) + 1;
                batch.update(doc.ref, {
                    likes: randomLikes,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                count++;
            }
        });
        
        if (count > 0) {
            await batch.commit();
            alert(`Random likes assigned to ${count} article(s)!`);
            loadViewsLikes();
        } else {
            alert('All articles already have likes assigned.');
        }
    } catch (error) {
        console.error('Error assigning random likes:', error);
        alert('Error assigning random likes: ' + error.message);
    }
}

async function showVisitsBreakdown() {
    try {
        const modal = document.getElementById('visitsModal');
        const modalBody = document.getElementById('visitsModalBody');
        
        modal.classList.add('active');
        modalBody.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
        
        const statsDoc = await db.collection('stats').doc('website').get();
        
        if (!statsDoc.exists) {
            modalBody.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">No visit data available yet.</div>';
            return;
        }
        
        const stats = statsDoc.data();
        const dailyVisits = stats.dailyVisits || {};
        
        if (Object.keys(dailyVisits).length === 0) {
            modalBody.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">No visit data available yet.</div>';
            return;
        }
        
        // Convert to array and sort by date (newest first)
        const visitsArray = Object.entries(dailyVisits).map(([date, count]) => ({
            date,
            count
        }));
        
        visitsArray.sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });
        
        // Calculate total
        const total = visitsArray.reduce((sum, item) => sum + item.count, 0);
        
        // Format date for display
        function formatDate(dateString) {
            const date = new Date(dateString + 'T00:00:00');
            return date.toLocaleDateString('en-IN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'short'
            });
        }
        
        let html = `
            <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <h4 style="margin: 0 0 10px 0; color: var(--text-dark);">Total Visits: <strong>${total.toLocaleString()}</strong></h4>
                <p style="margin: 0; color: var(--text-light); font-size: 0.9rem;">Showing ${visitsArray.length} day(s) of data</p>
            </div>
            <div style="max-height: 500px; overflow-y: auto;">
                <table class="data-table" style="width: 100%;">
                    <thead>
                        <tr>
                            <th style="text-align: left;">Date</th>
                            <th style="text-align: right;">Visits</th>
                            <th style="text-align: right;">Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        visitsArray.forEach(item => {
            const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
            html += `
                <tr>
                    <td>${formatDate(item.date)}</td>
                    <td style="text-align: right; font-weight: 600;">${item.count.toLocaleString()}</td>
                    <td style="text-align: right; color: var(--text-light);">${percentage}%</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        modalBody.innerHTML = html;
    } catch (error) {
        console.error('Error loading visits breakdown:', error);
        document.getElementById('visitsModalBody').innerHTML = 
            '<div style="text-align: center; padding: 40px; color: #dc3545;">Error loading visit data. Please try again.</div>';
    }
}

async function assignRandomBoth() {
    if (!confirm('This will assign random views (100-500) and likes (1-100) to all articles that don\'t have these fields set. Continue?')) {
        return;
    }
    
    try {
        const articlesSnapshot = await db.collection('articles')
            .where('status', '==', 'published')
            .get();
        
        const batch = db.batch();
        let count = 0;
        
        articlesSnapshot.forEach(doc => {
            const article = doc.data();
            const needsViews = article.views === undefined || article.views === null;
            const needsLikes = article.likes === undefined || article.likes === null;
            
            if (needsViews || needsLikes) {
                const updateData = {
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                if (needsViews) {
                    updateData.views = Math.floor(Math.random() * (500 - 100 + 1)) + 100;
                }
                
                if (needsLikes) {
                    updateData.likes = Math.floor(Math.random() * (100 - 1 + 1)) + 1;
                }
                
                batch.update(doc.ref, updateData);
                count++;
            }
        });
        
        if (count > 0) {
            await batch.commit();
            alert(`Random views and likes assigned to ${count} article(s)!`);
            loadViewsLikes();
        } else {
            alert('All articles already have views and likes assigned.');
        }
    } catch (error) {
        console.error('Error assigning random views and likes:', error);
        alert('Error assigning random views and likes: ' + error.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                [{ 'font': [] }],
                [{ 'size': ['small', false, 'large', 'huge'] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'script': 'sub'}, { 'script': 'super' }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'indent': '-1'}, { 'indent': '+1' }],
                [{ 'align': [] }],
                ['blockquote', 'code-block'],
                ['link', 'image'],
                ['clean']
            ]
        }
    });
    
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Enhanced sidebar functionality for mobile
    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebarBackdrop');
        const isActive = sidebar.classList.contains('active');
        
        if (isActive) {
            sidebar.classList.remove('active');
            if (backdrop) backdrop.classList.remove('active');
            document.body.classList.remove('sidebar-open');
        } else {
            sidebar.classList.add('active');
            if (backdrop) backdrop.classList.add('active');
            if (window.innerWidth <= 1024) {
                document.body.classList.add('sidebar-open');
            }
        }
    }

    // Close sidebar function
    function closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebarBackdrop');
        sidebar.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
        document.body.classList.remove('sidebar-open');
    }

    // Menu link click handlers with auto-close on mobile
    document.querySelectorAll('.menu-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.closest('.menu-link').getAttribute('data-section');
            showSection(section);
            
            // Close sidebar on mobile after menu selection
            if (window.innerWidth <= 1024) {
                closeSidebar();
            }
        });
    });
    
    // Sidebar toggle button
    document.getElementById('sidebarToggle').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSidebar();
    });

    // Close sidebar when clicking backdrop
    const backdrop = document.getElementById('sidebarBackdrop');
    if (backdrop) {
        backdrop.addEventListener('click', () => {
            closeSidebar();
        });
    }

    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.innerWidth > 1024) {
                // On desktop, ensure sidebar is visible and backdrop is hidden
                const sidebar = document.getElementById('sidebar');
                const backdrop = document.getElementById('sidebarBackdrop');
                sidebar.classList.remove('active');
                if (backdrop) backdrop.classList.remove('active');
                document.body.classList.remove('sidebar-open');
            }
        }, 250);
    });
    
    document.getElementById('articleImage').addEventListener('change', handleImageSelect);
    document.getElementById('cropBtn').addEventListener('click', openCropModal);
    document.getElementById('closeCropModal').addEventListener('click', closeCropModal);
    document.getElementById('cancelCrop').addEventListener('click', closeCropModal);
    document.getElementById('applyCrop').addEventListener('click', applyCrop);
    
    document.getElementById('additionalImages').addEventListener('change', function(e) {
        const previewContainer = document.getElementById('additionalImagesPreview');
        const files = e.target.files;
        
        // Clear existing previews for new files
        const existingCount = existingAdditionalImages.length;
        
        Array.from(files).forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const div = document.createElement('div');
                div.className = 'additional-image-item';
                div.innerHTML = `
                    <img src="${event.target.result}" alt="Preview">
                `;
                previewContainer.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    });
    
    document.getElementById('articleForm').addEventListener('submit', (e) => handleArticleSubmit(e, false));
    document.getElementById('saveDraftBtn').addEventListener('click', (e) => handleArticleSubmit(e, true));
    
    document.getElementById('articleTagline').addEventListener('input', (e) => {
        document.getElementById('taglineCount').textContent = e.target.value.length;
    });
    
    document.getElementById('genreForm').addEventListener('submit', handleGenreSubmit);
    
    // Setup icon selector for new genre form
    const iconSelectorBtn = document.getElementById('iconSelectorBtn');
    const iconSelector = document.getElementById('iconSelector');
    const iconSearch = document.getElementById('iconSearch');
    const iconClose = iconSelector?.querySelector('.icon-selector-close');
    
    if (iconSelectorBtn && iconSelector) {
        iconSelectorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleIconSelector(iconSelector);
        });
        
        if (iconClose) {
            iconClose.addEventListener('click', () => {
                iconSelector.style.display = 'none';
            });
        }
        
        if (iconSearch) {
            iconSearch.addEventListener('input', (e) => {
                filterIcons(e.target);
            });
        }
        
        // Initialize icon grid
        initializeIconSelector('iconGrid');
        
        // Setup icon selection
        const iconGrid = document.getElementById('iconGrid');
        if (iconGrid) {
            iconGrid.addEventListener('click', (e) => {
                const iconOption = e.target.closest('.icon-option');
                if (iconOption) {
                    const icon = iconOption.getAttribute('data-icon');
                    const wrapper = iconSelector.closest('.icon-selector-wrapper');
                    selectIcon(icon, wrapper);
                }
            });
        }
    }
    
    // Close icon selector when clicking outside
    document.addEventListener('click', (e) => {
        if (iconSelector && !iconSelector.contains(e.target) && !iconSelectorBtn.contains(e.target)) {
            iconSelector.style.display = 'none';
        }
    });
    document.getElementById('settingsForm').addEventListener('submit', handleSettingsSubmit);
    
    // Live News
    document.getElementById('liveNewsForm').addEventListener('submit', handleLiveNewsSubmit);
    document.getElementById('liveNewsText').addEventListener('input', (e) => {
        document.getElementById('liveNewsCharCount').textContent = e.target.value.length;
    });
    
    document.getElementById('closeViewModal').addEventListener('click', () => {
        document.getElementById('viewModal').classList.remove('active');
    });
    
    document.getElementById('closeVisitsModal').addEventListener('click', () => {
        document.getElementById('visitsModal').classList.remove('active');
    });
    
    // Add click handler for visits breakdown
    const totalVisitsCard = document.getElementById('totalVisitsCard');
    if (totalVisitsCard) {
        totalVisitsCard.addEventListener('click', showVisitsBreakdown);
    }
    
    window.onclick = (e) => {
        const cropModal = document.getElementById('cropModal');
        const viewModal = document.getElementById('viewModal');
        const visitsModal = document.getElementById('visitsModal');
        if (e.target === cropModal) {
            closeCropModal();
        }
        if (e.target === viewModal) {
            viewModal.classList.remove('active');
        }
        if (e.target === visitsModal) {
            visitsModal.classList.remove('active');
        }
    };
});


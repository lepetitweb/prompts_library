let prompts = [];
let currentPrompt = null;

document.addEventListener('DOMContentLoaded', () => {
    loadPrompts();
    showMainView();
    document.getElementById('searchBar').addEventListener('input', filterPrompts);
    document.getElementById('addButton').addEventListener('click', () => openPromptDetail());
    document.getElementById('savePromptButton').addEventListener('click', savePrompt);
    document.getElementById('cancelButton').addEventListener('click', () => showMainView());
    document.getElementById('addTagButton').addEventListener('click', addTag);
    document.getElementById('deletePromptButton').addEventListener('click', deletePrompt);

    document.getElementById('exportButton').addEventListener('click', exportPrompts);
    document.getElementById('importButton').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('fileInput').addEventListener('change', importPrompts);
});

function exportPrompts() {
    const jsonString = JSON.stringify(prompts);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompts_export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importPrompts(event) {
    const file = event.target && event.target.files && event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedPrompts = JSON.parse(e.target.result);
                
                chrome.storage.sync.get('prompts', (data) => {
                    let existingPrompts = data.prompts || [];
                    
                    const promptExists = (newPrompt) => {
                        return existingPrompts.some(existingPrompt => 
                            existingPrompt.prompt === newPrompt.prompt &&
                            existingPrompt.title === newPrompt.title
                        );
                    };
                    
                    importedPrompts.forEach(newPrompt => {
                        if (!promptExists(newPrompt)) {
                            newPrompt.id = Date.now() + Math.random().toString(36).substr(2, 9);
                            newPrompt.createdAt = new Date().toISOString();
                            existingPrompts.push(newPrompt);
                        }
                    });
                    
                    chrome.storage.sync.set({ prompts: existingPrompts }, () => {
                        console.log('Prompts importés et ajoutés');
                        loadPrompts();
                        showMainView();
                        alert(`${importedPrompts.length} prompts importés. ${existingPrompts.length - data.prompts.length} nouveaux prompts ajoutés.`);
                    });
                });
            } catch (error) {
                console.error('Erreur lors de l\'importation:', error);
                alert('Erreur lors de l\'importation du fichier JSON');
            }
        };
        reader.readAsText(file);
    }
}

function showMainView() {
    const mainView = document.getElementById('mainView');
    const promptDetail = document.getElementById('promptDetail');
    if (mainView && promptDetail) {
        mainView.style.display = 'block';
        promptDetail.style.display = 'none';
    }
    currentPrompt = null;
}

function openPromptDetail(index = null) {
    const mainView = document.getElementById('mainView');
    const promptDetail = document.getElementById('promptDetail');
    const detailTitle = document.getElementById('detailTitle');
    const deletePromptButton = document.getElementById('deletePromptButton');
    const promptTitleInput = document.getElementById('promptTitle');
    const promptTextInput = document.getElementById('promptText');

    if (mainView && promptDetail && detailTitle && deletePromptButton && promptTitleInput && promptTextInput) {
        mainView.style.display = 'none';
        promptDetail.style.display = 'block';
        
        if (index === null) {
            currentPrompt = { title: '', prompt: '', tags: [] };
            detailTitle.textContent = 'Ajouter un Prompt';
            deletePromptButton.style.display = 'none';
        } else {
            if (index >= 0 && index < prompts.length) {
                currentPrompt = { ...prompts[index] };
                currentPrompt.tags = Array.isArray(currentPrompt.tags) ? currentPrompt.tags : [];
                detailTitle.textContent = 'Éditer un Prompt';
                deletePromptButton.style.display = 'inline-block';
            } else {
                console.error('Index de prompt invalide');
                return;
            }
        }
        
        promptTitleInput.value = currentPrompt.title || '';
        promptTextInput.value = currentPrompt.prompt || '';
        displayTags();
    }
}

function deletePrompt() {
    if (currentPrompt && currentPrompt.id) {
        const index = prompts.findIndex(p => p.id === currentPrompt.id);
        if (index !== -1) {
            prompts.splice(index, 1);
            chrome.storage.sync.set({ prompts }, () => {
                console.log('Prompt supprimé');
                showMainView();
                loadPrompts();
            });
        }
    }
}

function loadPrompts() {
    chrome.storage.sync.get('prompts', (data) => {
        prompts = data.prompts || [];
        prompts = prompts.map(prompt => ({
            ...prompt,
            tags: Array.isArray(prompt.tags) ? prompt.tags : []
        }));
        displayPrompts(prompts);
    });
}

function displayPrompts(promptsToDisplay) {
    const promptList = document.getElementById('promptList');
    if (promptList) {
        promptList.innerHTML = '';
        promptsToDisplay.forEach((prompt, index) => {
            const promptItem = document.createElement('div');
            promptItem.className = 'promptItem';
            
            const previewText = prompt.prompt.length > 75 
                ? prompt.prompt.substring(0, 75) + '...'
                : prompt.prompt;
            
            promptItem.innerHTML = `
                <div class="promptContent">
                    <strong class="promptTitle">${prompt.title}</strong>
                    <p class="promptPreview">${previewText}</p>
                </div>
                <div class="promptActions">
                    <i class="fas fa-copy copyIcon" data-index="${index}"></i>
                </div>
            `;
            promptItem.addEventListener('click', () => openPromptDetail(index));
            promptList.appendChild(promptItem);
        });
        document.querySelectorAll('.copyIcon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                copyPrompt(parseInt(e.target.getAttribute('data-index')));
            });
        });
    }
}

function filterPrompts() {
    const searchBar = document.getElementById('searchBar');
    if (searchBar) {
        const searchTerm = searchBar.value.toLowerCase();
        const filteredPrompts = prompts.filter(prompt => 
            prompt.title.toLowerCase().includes(searchTerm) || 
            prompt.prompt.toLowerCase().includes(searchTerm)
        );
        displayPrompts(filteredPrompts);
    }
}

function displayTags() {
    const tagList = document.getElementById('tagList');
    if (tagList && currentPrompt && Array.isArray(currentPrompt.tags)) {
        tagList.innerHTML = '';
        currentPrompt.tags.forEach(tag => {
            if (typeof tag === 'string' && tag.trim() !== '') {
                const tagElement = document.createElement('span');
                tagElement.textContent = tag;
                tagElement.className = 'tag';
                tagList.appendChild(tagElement);
            }
        });
    }
}

function addTag() {
    const tagInput = document.getElementById('tagInput');
    if (currentPrompt && Array.isArray(currentPrompt.tags) && tagInput) {
        const newTag = tagInput.value.trim();
        if (newTag && !currentPrompt.tags.includes(newTag)) {
            currentPrompt.tags.push(newTag);
            tagInput.value = '';
            displayTags();
        }
    }
}

function savePrompt() {
    const promptTitleInput = document.getElementById('promptTitle');
    const promptTextInput = document.getElementById('promptText');
    
    if (currentPrompt && promptTitleInput && promptTextInput) {
        currentPrompt.title = promptTitleInput.value;
        currentPrompt.prompt = promptTextInput.value;
        
        if (currentPrompt.id === undefined) {
            currentPrompt.id = Date.now();
            currentPrompt.createdAt = new Date().toISOString();
            prompts.push(currentPrompt);
        } else {
            const index = prompts.findIndex(p => p.id === currentPrompt.id);
            currentPrompt.updatedAt = new Date().toISOString();
            if (index !== -1) {
                prompts[index] = currentPrompt;
            }
        }
        
        chrome.storage.sync.set({ prompts }, () => {
            console.log('Prompts sauvegardés');
            showMainView();
            loadPrompts();
        });
    }
}

function copyPrompt(index) {
    if (index >= 0 && index < prompts.length) {
        navigator.clipboard.writeText(prompts[index].prompt).then(() => {
            console.log('Prompt copié dans le presse-papier');
        });
    }
}
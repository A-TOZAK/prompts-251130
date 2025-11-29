let allPromptsData = [];

document.addEventListener('DOMContentLoaded', () => {
    loadPrompts();

    document.getElementById('promptForm').addEventListener('submit', handleSubmission);

    // Add event listeners for search and filter
    document.getElementById('searchInput').addEventListener('input', filterPrompts);
    document.getElementById('schoolFilter').addEventListener('change', filterPrompts);
    document.getElementById('subjectFilter').addEventListener('change', filterPrompts);
});

async function loadPrompts() {
    const promptList = document.getElementById('promptList');
    const loadingMessage = document.getElementById('loadingMessage');

    try {
        // 1. Fetch static prompts from JSON file
        const response = await fetch('data/prompts.json');
        let staticPrompts = [];
        if (response.ok) {
            staticPrompts = await response.json();
        }

        // 2. Fetch local prompts from LocalStorage
        const localPrompts = JSON.parse(localStorage.getItem('teacherPrompts') || '[]');

        // 3. Merge and sort (newest first)
        allPromptsData = [...localPrompts, ...staticPrompts].sort((a, b) => {
            // Handle cases where created_at might be missing or invalid
            const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
            const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
            return dateB - dateA;
        });

        // 4. Render initial list
        renderPrompts(allPromptsData);

    } catch (error) {
        console.error('Error loading prompts:', error);
        loadingMessage.textContent = '読み込みに失敗しました。';
    }
}

function renderPrompts(prompts) {
    const promptList = document.getElementById('promptList');

    if (prompts.length === 0) {
        promptList.innerHTML = `
            <div class="card" style="text-align: center; color: var(--text-muted);">
                <p>条件に一致するプロンプトが見つかりませんでした。</p>
            </div>
        `;
    } else {
        promptList.innerHTML = prompts.map(prompt => createPromptHTML(prompt)).join('');
    }
}

function filterPrompts() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const schoolFilter = document.getElementById('schoolFilter').value;
    const subjectFilter = document.getElementById('subjectFilter').value;

    const filtered = allPromptsData.filter(prompt => {
        const matchesSearch = (
            (prompt.title && prompt.title.toLowerCase().includes(searchText)) ||
            (prompt.content && prompt.content.toLowerCase().includes(searchText)) ||
            (prompt.subject && prompt.subject.toLowerCase().includes(searchText))
        );

        const matchesSchool = schoolFilter === '' || prompt.school_type === schoolFilter;
        // For subject, we might want partial match if categories are broad, but exact match is safer for now.
        // Or "includes" if multiple subjects. Let's use includes for flexibility.
        const matchesSubject = subjectFilter === '' || (prompt.subject && prompt.subject.includes(subjectFilter));

        return matchesSearch && matchesSchool && matchesSubject;
    });

    renderPrompts(filtered);
}

function createPromptHTML(prompt) {
    // Escape HTML to prevent XSS
    const escape = (str) => {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    const date = prompt.created_at ? new Date(prompt.created_at).toLocaleDateString('ja-JP') : '';

    return `
        <article class="prompt-item">
            <div class="prompt-header">
                <div class="prompt-tags">
                    <span class="tag school-type">${escape(prompt.school_type)}</span>
                    <span class="tag subject">${escape(prompt.subject)}</span>
                </div>
                <time datetime="${escape(prompt.created_at)}" style="font-size: 0.8rem; color: #9ca3af;">
                    ${date}
                </time>
            </div>
            <h3 style="margin-bottom: 0.5rem; font-size: 1.25rem;">${escape(prompt.title)}</h3>
            <div class="prompt-content">${escape(prompt.content)}</div>
            <div class="prompt-footer">
                <span>${prompt.description ? escape(prompt.description) : ''}</span>
                <button class="copy-btn" onclick="copyToClipboard(this, \`${escape(prompt.content).replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`)">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    コピー
                </button>
            </div>
        </article>
    `;
}

function handleSubmission(e) {
    e.preventDefault();

    const title = document.getElementById('title').value;
    const school_type = document.getElementById('school_type').value;
    const subject = document.getElementById('subject').value;
    const content = document.getElementById('content').value;

    if (!title || !school_type || !subject || !content) return;

    const newPrompt = {
        id: 'local-' + Date.now(),
        title,
        school_type,
        subject,
        content,
        created_at: new Date().toISOString()
    };

    // Save to LocalStorage
    const localPrompts = JSON.parse(localStorage.getItem('teacherPrompts') || '[]');
    localPrompts.unshift(newPrompt);
    localStorage.setItem('teacherPrompts', JSON.stringify(localPrompts));

    // Reset form and reload list
    e.target.reset();
    loadPrompts();

    alert('プロンプトを保存しました（ブラウザにのみ保存されます）');
}

function copyToClipboard(button, text) {
    // We can just use the text passed in, but it is HTML escaped.
    // To get the raw text, we should decode it or grab it from the DOM.
    // Grabbing from DOM is safer and easier.
    const article = button.closest('.prompt-item');
    const contentDiv = article.querySelector('.prompt-content');
    const textToCopy = contentDiv.textContent;

    navigator.clipboard.writeText(textToCopy).then(() => {
        const originalContent = button.innerHTML;
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 14px; height: 14px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            コピーしました
        `;
        button.style.color = '#059669';
        button.style.borderColor = '#059669';
        button.style.backgroundColor = '#ecfdf5';

        setTimeout(() => {
            button.innerHTML = originalContent;
            button.style.color = '';
            button.style.borderColor = '';
            button.style.backgroundColor = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('コピーに失敗しました');
    });
}

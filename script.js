document.addEventListener('DOMContentLoaded', () => {
    loadPrompts();

    document.getElementById('promptForm').addEventListener('submit', handleSubmission);
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
        const allPrompts = [...localPrompts, ...staticPrompts].sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at);
        });

        // 4. Render
        if (allPrompts.length === 0) {
            promptList.innerHTML = `
                <div class="card" style="text-align: center; color: var(--text-muted);">
                    <p>まだ投稿がありません。最初のプロンプトを投稿してみましょう！</p>
                </div>
            `;
        } else {
            promptList.innerHTML = allPrompts.map(prompt => createPromptHTML(prompt)).join('');
        }
    } catch (error) {
        console.error('Error loading prompts:', error);
        loadingMessage.textContent = '読み込みに失敗しました。';
    }
}

function createPromptHTML(prompt) {
    // Escape HTML to prevent XSS
    const escape = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    const date = new Date(prompt.created_at).toLocaleDateString('ja-JP');

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
                <span></span>
                <button class="copy-btn" onclick="copyToClipboard(this, \`${escape(prompt.content).replace(/`/g, '\\`')}\`)">
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
    // Decode HTML entities if necessary, but for simple copy we just use the raw text
    // However, since we escaped it for display, we might want to unescape for copy if we were grabbing from DOM.
    // But here we are passing the string directly.
    // Wait, the string passed to onclick is already escaped in HTML generation.
    // Let's use a safer approach: write the text to a hidden textarea and copy, or use the modern API with unescaped text.
    // Actually, the simplest way for the button onclick is to grab the text content of the sibling .prompt-content div.

    // Let's find the content div relative to the button
    const article = button.closest('.prompt-item');
    const contentDiv = article.querySelector('.prompt-content');
    const textToCopy = contentDiv.textContent; // .textContent gets the unescaped text

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

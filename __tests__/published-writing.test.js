const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const articleTitle = 'Vector Search vs. Knowledge Graphs: Where Microsoft Fabric Graph Fits';
const articleUrl = 'https://techcommunity.microsoft.com/blog/educatordeveloperblog/vector-search-vs-knowledge-graphs-where-microsoft-fabric-graph-fits/4561849';
const articleImage = 'Images/blog/fabric-graph-cover.jpg';
const externalPosts = JSON.parse(fs.readFileSync(path.join(root, 'blog-data', 'external-posts.json'), 'utf8'));

function createBlogManager() {
    const source = fs.readFileSync(path.join(root, 'blog.js'), 'utf8');
    const BlogManager = new Function(`${source.replace(/document\.addEventListener\('DOMContentLoaded'[\s\S]*$/, '')}; return BlogManager;`)();
    const manager = Object.create(BlogManager.prototype);
    manager.posts = [];
    manager.externalPosts = externalPosts;
    return manager;
}

test('published writing links to the article and uses its existing cover', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const page = new DOMParser().parseFromString(html, 'text/html');
    const cards = Array.from(page.querySelectorAll('#writing .writing-card'));
    const matches = cards.filter(card => card.getAttribute('href') === articleUrl);

    expect(matches).toHaveLength(1);
    expect(cards[0]).toBe(matches[0]);
    expect(matches[0].querySelector('h3').textContent).toBe(articleTitle);
    expect(matches[0].querySelector('.writing-card-meta').textContent).toContain('Nov 2026');
    expect(matches[0].querySelector('img').getAttribute('src')).toBe(articleImage);
    expect(fs.existsSync(path.join(root, articleImage))).toBe(true);
    expect(matches[0].getAttribute('target')).toBe('_blank');
    expect(matches[0].getAttribute('rel').split(/\s+/)).toContain('noopener');
});

test('the external blog feed renders, filters, and opens the article', () => {
    const matches = externalPosts.filter(post => post.externalUrl === articleUrl);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual(expect.objectContaining({
        id: 'ext-fabric-graph-vector-search',
        title: articleTitle,
        category: 'ai-copilot',
        image: articleImage,
        date: '2026-11-04T08:00:00.082Z',
        source: 'Microsoft Tech Community'
    }));

    document.body.innerHTML = '<div><div id="blog-posts-container"><div id="empty-blog-state"><p></p></div></div></div>';
    const manager = createBlogManager();
    manager.currentFilter = 'ai-copilot';
    manager.currentPage = 1;
    manager.postsPerPage = 6;
    manager.postsContainer = document.getElementById('blog-posts-container');
    manager.emptyState = document.getElementById('empty-blog-state');
    manager.checkScheduledPosts = jest.fn();
    manager.renderPagination = jest.fn();
    manager.renderPosts();

    const card = manager.postsContainer.querySelector('.blog-card');
    expect(card.dataset.postId).toBe(matches[0].id);
    expect(card.dataset.category).toBe('ai-copilot');
    expect(card.querySelector('.blog-title').textContent).toBe(articleTitle);
    expect(card.querySelector('img').getAttribute('src')).toBe(articleImage);
    expect(card.getAttribute('role')).toBe('link');
    expect(card.getAttribute('tabindex')).toBe('0');
    expect(manager.getPostsForContext()[0]).toEqual(expect.objectContaining({ title: articleTitle, url: articleUrl }));

    const open = jest.spyOn(window, 'open').mockImplementation(() => null);
    manager.openExternalPost(matches[0].id);
    expect(open).toHaveBeenCalledWith(articleUrl, '_blank', 'noopener,noreferrer');
    open.mockRestore();
});

test('the chatbot receives the article in both writing and blog context', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
    document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/gi, '');
    window.blogManager = createBlogManager();

    jest.resetModules();
    const { JonEricChatBot } = require('../chat.js');
    const context = new JonEricChatBot().buildPortfolioDataContext();

    expect(context.writing).toContain(articleTitle);
    expect(context.writing).toContain(articleUrl);
    expect(context.blog).toContain(articleTitle);
    expect(context.blog).toContain(articleUrl);
});

test('the career timeline includes the article before the November certification', () => {
    const html = fs.readFileSync(path.join(root, 'career-timeline.html'), 'utf8');
    const timeline = new DOMParser().parseFromString(html, 'text/html');
    const entries = Array.from(timeline.querySelectorAll('.tl-item'));
    const articleIndex = entries.findIndex(entry => entry.querySelector('a')?.getAttribute('href') === articleUrl);
    const certificationIndex = entries.findIndex(entry =>
        entry.textContent.includes('Microsoft Certified: AI Transformation Leader')
    );

    expect(articleIndex).toBeGreaterThanOrEqual(0);
    expect(certificationIndex).toBeGreaterThan(articleIndex);
    expect(entries[articleIndex].dataset.year).toBe('Nov 2026');
    expect(entries[articleIndex].querySelector('.tl-title').textContent.trim()).toBe(articleTitle);
    expect(entries[articleIndex].querySelector('img').getAttribute('src')).toBe(articleImage);
});

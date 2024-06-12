function handleSearch() {
    const keyword = document.getElementById('keywordInput').value;
    fetchUrls(keyword);
}

document.getElementById('searchBtn').addEventListener('click', handleSearch);

document.getElementById('keywordInput').addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        handleSearch();
    }
});

async function fetchUrls(keyword) {
    try {
        const response = await fetch(`/urls/${keyword}`);
        if (!response.ok) throw new Error('Ключевое слово не найдено');
        const urls = await response.json();
        displayUrls(urls, keyword);
    } catch (error) {
        alert(error.message);
    }
}

function displayUrls(urls, keyword) {
    const urlList = document.getElementById('urlList');
    urlList.innerHTML = '';
    urls.forEach((url) => {
        const li = document.createElement('li');
        li.textContent = url;
        li.addEventListener('click', () => downloadContent(url, keyword));
        li.addEventListener('click', () => displayTags(url, keyword));
        urlList.appendChild(li);
    });
}

function parseHeadings(content) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    return Array.from(headings).map(heading => heading.textContent.trim());
}

function parseTexts(content) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const paragraphs = doc.querySelectorAll('p');
    return Array.from(paragraphs).map(p => p.textContent.trim());
}

function parseLinks(url, content) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const links = doc.querySelectorAll('a');
    return Array.from(links).map(a => {
        const preffixUrl = new URL(a.href, url).pathname;
        const absoluteUrl = url + preffixUrl;
        return absoluteUrl;
    })
};

async function fetchTags(url, keyword, tag) {
    try {
        const txtFile = await fetch(`/downloads/${keyword}.txt`);
        if (!txtFile.ok) throw new Error('Ошибка при загрузке файла');
        
        const htmlContent = await txtFile.text();
        let parsedData;

        switch(tag) {
            case 'Заголовки':
                parsedData = parseHeadings(htmlContent);
                break;
            case 'Тексты':
                parsedData = parseTexts(htmlContent);
                break;
            case 'Ссылки':
                parsedData = parseLinks(url, htmlContent);
                break;
            default:
                throw new Error('Неудачная попытка парсинга тeга');
        }
        loadContent(parsedData);
    } catch (error) {
        alert(error.message);
    }
};

function displayTags(url, keyword) {
    const tagList = document.getElementById('tagList');
    const tags = ['Заголовки', 'Тексты', 'Ссылки'];
    tagList.innerHTML = '';
    tags.forEach((tag) => {
        const li = document.createElement('li');
        li.textContent = tag;
        li.addEventListener('click', () => fetchTags(url, keyword, tag));
        tagList.appendChild(li);
    });
}

function loadContent(content) {
    const contentDisplay = document.getElementById('contentDisplay');
    contentDisplay.innerHTML = '';

    content.forEach(item => {
        const p = document.createElement('p');
        p.textContent = item;
        contentDisplay.appendChild(p);
    });
    saveContentToLocalStorage(content)
}

function downloadContent(url, keyword) {
    const ws = new WebSocket(`ws://${window.location.host}`);
    ws.onopen = () => {
        ws.send(JSON.stringify({ url, keyword }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.error) {
            alert(data.error);
        } else {
            document.getElementById('downloadStatus').textContent = `Загрузка: ${data.progress}%`;
            if (data.progress === '100.00') {
                loadContent(keyword);
            }
        }
    };
}

function saveContentToLocalStorage(content) {
    try {
        const contentString = JSON.stringify(content);
        localStorage.setItem('savedContent', contentString);
        console.log('Контент сохранен в localStorage.');
    } catch (error) {
        console.error('Ошибка при сохранении контента в localStorage:', error);
    }
}


function loadContentFromLocalStorage() {
    try {
        const savedContentString = localStorage.getItem('savedContent');
        if (savedContentString) {
            const savedContent = JSON.parse(savedContentString);
            loadContent(savedContent);
        }
    } catch (error) {
        console.error('Ошибка при загрузке контента из localStorage:', error);
    }
}
document.addEventListener('DOMContentLoaded', loadContentFromLocalStorage);


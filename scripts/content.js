(() => {
    // Constants
    let BACKEND_BASE_URL;
    const ortam ="prod"
    if (ortam=="dev") {
      
      BACKEND_BASE_URL = 'http://localhost:5000/api';
    }else if (ortam=="prod") {
      
      BACKEND_BASE_URL = 'https://sahibinden-backend-production.up.railway.app/api';
    }
    const EVALUATE_BUTTON_ID = 'evaluateCarButton';
    const EVALUATION_TABLE_ID = 'evaluationResultTable';
    const STYLE_ID = 'customStyles';
    const LOADING_INDICATOR_ID = 'loadingIndicator';
    const NOTIFICATION_DURATION = 3000;
    const URL_CHECK_INTERVAL = 1000;
  
    // Initialize the script
    init();
  
    function init() {
      injectStyles(); // Stil dosyalarını her sayfada yükle
      monitorUrlChanges();
      processCurrentPage();
    }
  
    // Monitor URL changes to handle SPA navigation
    function monitorUrlChanges() {
      let lastUrl = location.href;
      setInterval(() => {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
          lastUrl = currentUrl;
          processCurrentPage();
        }
      }, URL_CHECK_INTERVAL);
    }
  
    // Determine which page we're on and act accordingly
    function processCurrentPage() {
      if (isCarDetailPage()) {
        injectEvaluateButton();
      } else if (isListingPage()) {
        processListingPage();
      } else {
        removeInjectedElements();
      }
    }
  
    // Check if the current page is a car detail page
    function isCarDetailPage() {
      return (
        window.location.href.includes('/ilan/vasita') &&
        (document.querySelector('.classifiedUserBox') || document.querySelector('.user-info-module'))
      );
    }
  
    // Check if the current page is a listing page
    function isListingPage() {
      return document.querySelector('#searchResultsTable');
    }
  
    // Remove injected elements when navigating away
    function removeInjectedElements() {
      removeElementById(EVALUATE_BUTTON_ID);
      removeElementById(EVALUATION_TABLE_ID);
    }
  
    // Inject styles and the "Evaluate Car" button on the car detail page
    function injectEvaluateButton() {
      if (document.getElementById(EVALUATE_BUTTON_ID)) return;
  
      const button = createEvaluateButton();
      const targetElement =
        document.querySelector('.classifiedUserBox') || document.querySelector('.user-info-module');
  
      if (targetElement) {
        targetElement.insertAdjacentElement('afterend', button);
        button.addEventListener('click', evaluateCar);
      }
    }
  
    // Inject custom styles into the page
  // injectStyles fonksiyonunu güncelliyoruz
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
  
    const styles = `
      .evaluate-btn {
        padding: 10px 20px;
        background-color: #1890ff;
        color: #fff;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
        margin-bottom: 12px;
      }
      #${EVALUATION_TABLE_ID} {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      #${EVALUATION_TABLE_ID} th,
      #${EVALUATION_TABLE_ID} td {
        border: 1px solid #ccc;
        padding: 8px;
        text-align: left;
        font-size: 14px;
      }
      #${EVALUATION_TABLE_ID} th {
        background-color: #f2f2f2;
      }
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        color: #fff;
        padding: 15px;
        z-index: 9999;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }
      .notification-success {
        background-color: #4caf50;
      }
      .notification-error {
        background-color: #f44336;
      }
      .notification-info {
        background-color: #2196f3;
      }
      .tooltip {
        position: absolute;
        background-color: #fff;
        color: #333;
        padding: 8px 12px;
        border-radius: 4px;
        z-index: 1000;
        font-size: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        border: 1px solid #ccc;
        max-width: 200px;
      }
      .tooltip-item {
        display: flex;
        align-items: center;
        margin-bottom: 4px;
      }
      .tooltip-item:last-child {
        margin-bottom: 0;
      }
      .tooltip-date {
        flex: 1;
      }
      .tooltip-price {
        flex: 1;
        text-align: right;
        margin-left: 8px;
      }
      .price-up {
        color: red;
      }
      .price-down {
        color: green;
      }
    `;
    const styleElement = document.createElement('style');
    styleElement.id = STYLE_ID;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
  
  
    // Create the "Evaluate Car" button element
    function createEvaluateButton() {
      const button = document.createElement('div');
      button.className = 'evaluate-btn';
      button.id = EVALUATE_BUTTON_ID;
      button.textContent = 'Aracı Değerlendir';
      return button;
    }
  
    // Fetch and evaluate car data
    async function evaluateCar() {
      const carData = extractCarDetailData();
      if (!carData) {
        alert('Araç bilgileri alınamadı.');
        return;
      }
  
      const loadingIndicator = showLoadingIndicator('Değerlendirme yapılıyor...');
      try {
        const response = await fetch(`${BACKEND_BASE_URL}/cars/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(carData),
        });
        const data = await response.json();
        loadingIndicator.remove();
  
        if (response.ok) {
          displayEvaluationResult(data, carData);
        } else {
          alert(`Değerlendirme yapılamadı: ${data.message}`);
        }
      } catch (error) {
        console.error('evaluateCar error:', error);
        alert('Değerlendirme yapılamadı.');
        loadingIndicator.remove();
      }
    }
  
    // Extract car data from the detail page
    function extractCarDetailData() {
      try {
        const carData = {};
        const classifiedInfoElement = document.querySelector('.classifiedInfoList');
        if (!classifiedInfoElement) return null;
  
        Object.assign(carData, parseClassifiedInfo(classifiedInfoElement.innerText));
  
        const detailElement = document.querySelector('.classifiedDescription');
        if (detailElement?.innerHTML) {
          carData.detail = parseDetailSections(detailElement.innerHTML);
        }
  
        const techDetailsElement = document.querySelector('.classifiedTechDetails');
        if (techDetailsElement?.innerHTML) {
          carData.techDetails = parseTechDetails(techDetailsElement.innerHTML);
        }
  if (document.querySelector('#classifiedDescription')&&document.querySelector('#classifiedDescription').innerText.length>0) {
    carData.detailText=  document.querySelector('#classifiedDescription').innerText.replaceAll("\n","-")
  }
  
        const priceElement = document.querySelector('.classified-price-wrapper');
        if (priceElement) {
          carData.fiyat = priceElement.innerText.trim();
        }
  
        console.log('Extracted car data:', carData);
        return carData;
      } catch (error) {
        console.error('extractCarDetailData error:', error);
        return null;
      }
    }
  
    // Parse classified information text into an object
    function parseClassifiedInfo(text) {
      const data = {};
      let key = null;
      text.split('\n').forEach((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine && !key) {
          key = trimmedLine;
        } else if (trimmedLine && key) {
          data[key.replace(/\s+/g, '')] = trimmedLine;
          key = null;
        }
      });
      return data;
    }
  
    // Parse detail sections from HTML
    function parseDetailSections(html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const sections = {};
  
      doc.querySelectorAll('h3').forEach((h3) => {
        const sectionTitle = h3.textContent.trim();
        const ulElement = h3.nextElementSibling?.tagName === 'UL' ? h3.nextElementSibling : null;
        if (ulElement) {
          const items = Array.from(ulElement.querySelectorAll('li')).map((li) => ({
            name: li.textContent.trim(),
            selected: li.classList.contains('selected'),
          }));
          sections[sectionTitle] = items;
        }
      });
      return sections;
    }
  
    // Parse technical details from HTML
    function parseTechDetails(html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const techDetails = {};
  
      doc.querySelectorAll('h3').forEach((h3) => {
        const sectionTitle = h3.textContent.trim();
        const tableElement = h3.nextElementSibling?.tagName === 'TABLE' ? h3.nextElementSibling : null;
        if (tableElement) {
          const specs = {};
          tableElement.querySelectorAll('tr').forEach((row) => {
            const key = row.querySelector('td.title')?.textContent.trim().replace(/\s+/g, ' ');
            const value = row.querySelector('td.value')?.textContent.trim().replace(/\s+/g, ' ');
            if (key && value) {
              specs[key] = value;
            }
          });
          techDetails[sectionTitle] = specs;
        }
      });
      return techDetails;
    }
  
    // Display a loading indicator with a given message
    function showLoadingIndicator(message) {
      const loadingDiv = document.createElement('div');
      loadingDiv.id = LOADING_INDICATOR_ID;
      loadingDiv.textContent = message;
      Object.assign(loadingDiv.style, {
        position: 'fixed',
        bottom: '60px',
        right: '20px',
        padding: '10px 20px',
        zIndex: '10000',
        backgroundColor: '#333',
        color: '#fff',
        borderRadius: '5px',
      });
      document.body.appendChild(loadingDiv);
      return loadingDiv;
    }
  
  // Display the evaluation result in a table below the button
  function displayEvaluationResult(data, carData) {
    removeElementById(EVALUATION_TABLE_ID);
  
    const resultTable = document.createElement('table');
    resultTable.id = EVALUATION_TABLE_ID;
  
    // Ortalama fiyatı formatlama
    const averagePriceNumber = Number(data.averagePrice) || 0;
    const formattedAveragePrice = averagePriceNumber.toLocaleString('tr-TR') + ' TL';
  
    // Mevcut aracın fiyatını alıp sayıya dönüştürme
    const carPrice = parseInt(carData.fiyat.replace(/\D/g, '')) || 0;
  
    // Fiyat farkı yüzdesini hesaplama
    let priceDifferencePercentage = 0;
    let priceComparisonText = '';
  
    if (averagePriceNumber > 0) {
      priceDifferencePercentage = ((carPrice - averagePriceNumber) / averagePriceNumber) * 100;
  
      if (priceDifferencePercentage < 0) {
        priceComparisonText = `%${Math.abs(priceDifferencePercentage.toFixed(2))} daha ucuz`;
      } else if (priceDifferencePercentage > 0) {
        priceComparisonText = `%${priceDifferencePercentage.toFixed(2)} daha pahalı`;
      } else {
        priceComparisonText = `Fiyat ortalama ile aynı`;
      }
    } else {
      priceComparisonText = 'Ortalama fiyat bulunamadı, karşılaştırma yapılamıyor.';
    }
  
    const tableRows = [
      createTableRow(
        `<strong>Marka / Seri / Model / Yıl:</strong> ${carData.Marka || ''} / ${carData.Seri || ''} / ${   carData.Model || ''}/ ${   carData.Yıl || ''}`
      ),
      createTableRow(`<strong>Benzer Araç Sayısı:</strong> ${data.similarCount || 0}`),
      createTableRow(`<strong>Ortalama Fiyat:</strong> ${formattedAveragePrice}`),
      createTableRow(`<strong>Bu araç ortalama fiyattan:</strong> ${priceComparisonText}`),
      createTableRow(`<strong>Değerlendirme:</strong><br>${data.evaluation}`),
    ];
  
    tableRows.forEach((row) => resultTable.appendChild(row));
  
    const evaluateButton = document.getElementById(EVALUATE_BUTTON_ID);
    if (evaluateButton) {
      evaluateButton.insertAdjacentElement('afterend', resultTable);
    }
  }
  
  
    // Create a table row with given HTML content
    function createTableRow(htmlContent) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 2;
      cell.innerHTML = htmlContent;
      row.appendChild(cell);
      return row;
    }
  
    // Remove an element by its ID
    function removeElementById(elementId) {
      const element = document.getElementById(elementId);
      if (element) element.remove();
    }
  
    // Process the listing page
    async function processListingPage() {
      try {
        const table = document.querySelector('#searchResultsTable');
        if (!table) return;
  
        const rows = table.querySelectorAll('tbody tr');
        if (rows.length === 0) return;
  
        const cars = [];
        const rowCarMap = new Map();
  
        rows.forEach((row) => {
          const car = extractCarListingData(row);
          if (car) {
            cars.push(car);
            rowCarMap.set(car.adId, row);
          }
        });
  
        // showNotification('Kaydetmeye başladı', 'info');
        console.log('Kaydetmeye başladı');
        const result = await saveCarData(cars);
        console.log(result);
        
        if (result) {
        
          
          // showNotification(result.message, 'success');
          processPriceHistories(result.data, rowCarMap);
        }
      } catch (error) {
        console.error('processListingPage error:', error);
        // showNotification('Sayfa işlenirken bir hata oluştu.', 'error');
      }
    }
  
    // Extract car data from a listing row
    function extractCarListingData(row) {
      try {
        const adId = row.getAttribute('data-id');
        if (!adId) return null;
  
        const index = getTableColumnIndices();
        const dataCells = row.querySelectorAll('td');
  
        const car = {
          adId: parseInt(adId),
          imageUrl: dataCells[index.imageUrl]?.querySelector('img')?.src || '',
          brand:
            index.brand !== null
              ? dataCells[index.brand]?.innerText.trim()
              : document.querySelector('#search_cats ul .cl2')?.innerText.trim() || '',
          series:
            index.series !== null
              ? dataCells[index.series]?.innerText.trim()
              : document.querySelector('#search_cats ul .cl3')?.innerText.trim() || '',
          model:
            index.model !== null
              ? dataCells[index.model]?.innerText.trim()
              : document.querySelector('#search_cats ul .cl4')?.innerText.trim() || '',
          title: row.querySelector('.classifiedTitle')?.innerText.trim() || '',
          year: parseInt(dataCells[index.year]?.innerText.trim()) || null,
          km: parseInt(dataCells[index.km]?.innerText.replace(/\D/g, '')) || null,
          price: parseInt(dataCells[index.price]?.innerText.replace(/\D/g, '')) || null,
          adDate: dataCells[index.adDate]?.innerText.trim().replace('\n', ' ') || '',
          adUrl:
            'https://www.sahibinden.com' +
              row.querySelector('.classifiedTitle')?.getAttribute('href') || '',
        };
  
        // Extract location data
        const { city, ilce, semt, mahalle } = extractLocationData(dataCells, index.location);
        Object.assign(car, { city, ilce, semt, mahalle });
  
        return car;
      } catch (error) {
        console.error('extractCarListingData error:', error);
        return null;
      }
    }
  
    // Get column indices based on table headers
    function getTableColumnIndices() {
      const index = {
        imageUrl: 0,
        brand: null,
        series: null,
        model: null,
        title: null,
        year: null,
        km: null,
        price: null,
        adDate: null,
        location: null,
      };
  
      const headers = document.querySelectorAll('#searchResultsTable thead tr td');
      headers.forEach((el) => {
        const headerText = el.innerText.trim();
        switch (headerText) {
          case 'Marka':
            index.brand = el.cellIndex;
            break;
          case 'Seri':
            index.series = el.cellIndex;
            break;
          case 'Model':
            index.model = el.cellIndex;
            break;
          case 'İlan Başlığı':
            index.title = el.cellIndex;
            break;
          case 'Yıl':
            index.year = el.cellIndex;
            break;
          case 'KM':
            index.km = el.cellIndex;
            break;
          case 'Fiyat':
            index.price = el.cellIndex;
            break;
          case 'İlan Tarihi':
            index.adDate = el.cellIndex;
            break;
          case 'İlçe / Semt':
          case 'İl / İlçe':
          case 'Semt / Mahalle':
            index.location = el.cellIndex;
            break;
        }
      });
  
      return index;
    }
  
    // Extract location data from a table row
    function extractLocationData(dataCells, locationIndex) {
      let city = '';
      let ilce = '';
      let semt = '';
      let mahalle = '';
  
      const locationHeaderTitle = document
        .querySelector('.searchResultsLocationHeader a')
        ?.getAttribute('title');
      const locationCell = dataCells[locationIndex];
      const locationTexts = locationCell?.innerText.trim().split('\n') || [];
  
      switch (locationHeaderTitle) {
        case 'İl / İlçe':
          city = locationTexts[0] || '';
          ilce = locationTexts[1] || '';
          break;
        case 'İlçe / Semt':
          city = document.querySelector('[data-address="city"] a')?.innerText.trim() || '';
          ilce = locationTexts[0] || '';
          semt = locationTexts[1] || '';
          break;
        case 'Semt / Mahalle':
          city = document.querySelector('[data-address="city"] a')?.innerText.trim() || '';
          ilce = document.querySelector('[data-address="town"] a')?.innerText.trim() || '';
          semt = locationTexts[0] || '';
          mahalle = locationTexts[1] || '';
          break;
      }
  
      return { city, ilce, semt, mahalle };
    }
  
    // Save car data to the backend
    async function saveCarData(cars) {
      try {
        const response = await fetch(`${BACKEND_BASE_URL}/cars`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cars),
        });
        const data = await response.json();
  
        if (!response.ok) {
          throw new Error(data.message || 'Veri gönderilirken bir hata oluştu.');
        }
  
        return data;
      } catch (error) {
        console.error('saveCarData error:', error);
        // showNotification('Veri gönderilirken bir hata oluştu.', 'error');
        return null;
      }
    }
  
    // Process price histories and update the UI
  function processPriceHistories(carDataList, rowCarMap) {
    carDataList.forEach((item) => {
      const { carData } = item;
      const { priceHistory, adId } = carData;
      const row = rowCarMap.get(adId);
  
      if (row && priceHistory && priceHistory.length > 0) {
        const firstPrice = priceHistory[0].price;
        const lastPrice = priceHistory[priceHistory.length - 1].price;
  
        if (firstPrice !== lastPrice) {
          const priceDifference = ((lastPrice - firstPrice) / firstPrice) * 100;
          const priceCell = row.querySelector('.searchResultsPriceValue');
  
          const differenceElement = document.createElement('div');
          differenceElement.style.fontSize = '12px';
          differenceElement.style.fontWeight = 'bold';
          differenceElement.style.color = priceDifference < 0 ? 'green' : 'red';
          differenceElement.innerText = `${Math.abs(priceDifference.toFixed(2))}% ${
            priceDifference < 0 ? '↓' : '↑'
          }`;
          priceCell.appendChild(differenceElement);
  
          // Tooltip için fiyat geçmişini hazırlama
          const tooltipData = [];
  
          for (let i = 0; i < priceHistory.length; i++) {
            const item = priceHistory[i];
            const date = new Date(item.updatedAt).toLocaleDateString('tr-TR');
            const price = item.price.toLocaleString() + ' TL';
  
            let trend = '';
            if (i > 0) {
              const previousPrice = priceHistory[i - 1].price;
              if (item.price > previousPrice) {
                trend = 'up';
              } else if (item.price < previousPrice) {
                trend = 'down';
              }
            }
  
            tooltipData.push({ date, price, trend });
          }
  
          priceCell.addEventListener('mouseenter', (e) => {
            showTooltip(priceCell, tooltipData, e);
          });
        }
      }
    });
  }
  
  
    // Show a notification message
    function showNotification(message, type = 'info') {
      const notification = document.createElement('div');
      notification.className = `notification notification-${type}`;
      notification.textContent = message;
      document.body.appendChild(notification);
  
      setTimeout(() => {
        notification.remove();
      }, NOTIFICATION_DURATION);
    }
  
  // Show a tooltip with given message
  function showTooltip(element, data, event) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
  
    data.forEach((item) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'tooltip-item';
  
      const dateSpan = document.createElement('span');
      dateSpan.className = 'tooltip-date';
      dateSpan.innerText = item.date;
  
      const priceSpan = document.createElement('span');
      priceSpan.className = 'tooltip-price';
      priceSpan.innerText = item.price;
  
      if (item.trend === 'up') {
        priceSpan.classList.add('price-up');
        priceSpan.innerHTML += ' ↑';
      } else if (item.trend === 'down') {
        priceSpan.classList.add('price-down');
        priceSpan.innerHTML += ' ↓';
      }
  
      itemDiv.appendChild(dateSpan);
      itemDiv.appendChild(priceSpan);
      tooltip.appendChild(itemDiv);
    });
  
    document.body.appendChild(tooltip);
  
    const moveTooltip = (e) => {
      tooltip.style.left = e.pageX + 10 + 'px';
      tooltip.style.top = e.pageY + 10 + 'px';
    };
  
    element.addEventListener('mousemove', moveTooltip);
  
    const removeTooltip = () => {
      tooltip.remove();
      element.removeEventListener('mousemove', moveTooltip);
      element.removeEventListener('mouseleave', removeTooltip);
    };
  
    element.addEventListener('mouseleave', removeTooltip);
  
    // Tooltip'i ilk konumlandırma
    tooltip.style.left = event.pageX + 10 + 'px';
    tooltip.style.top = event.pageY + 10 + 'px';
  }
  
  })();
  
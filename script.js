const provinceSelect = document.querySelector('#provinceSelect');
const userType = document.querySelector('#userType');
const checkBtn = document.querySelector('#checkBtn');
const retryBtn = document.querySelector('#retryBtn');

const loadingState = document.querySelector('#loadingState');
const errorState = document.querySelector('#errorState');
const emptyState = document.querySelector('#emptyState');
const resultCard = document.querySelector('#resultCard');
const lastCheckSection = document.querySelector('#lastCheckSection');
const lastCheckText = document.querySelector('#lastCheckText');

const provinceNames = {
  '13.7563,100.5018': 'กรุงเทพมหานคร',
  '18.7883,98.9853': 'เชียงใหม่',
  '16.4322,102.8236': 'ขอนแก่น',
  '13.3611,100.9847': 'ชลบุรี',
  '7.8804,98.3923': 'ภูเก็ต'
};

// โหลดผลการตรวจสอบล่าสุดจาก localStorage ตอนเปิดหน้าเว็บ
window.addEventListener('DOMContentLoaded', loadLastCheck);

checkBtn.addEventListener('click', function () {
  const coordString = provinceSelect.value;

  if (!coordString) {
    alert('กรุณาเลือกจังหวัดก่อนกดตรวจสอบ');
    return;
  }

  fetchAirQuality(coordString, userType.value);
});

retryBtn.addEventListener('click', function () {
  const coordString = provinceSelect.value;
  if (coordString) fetchAirQuality(coordString, userType.value);
});

async function fetchAirQuality(coordString, selectedUserType) {
  const [latitude, longitude] = coordString.split(',');

  showState('loading');

  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${latitude}` +
    `&longitude=${longitude}` +
    `&current=pm10,pm2_5,us_aqi` +
    `&timezone=Asia%2FBangkok`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('API ตอบกลับผิดพลาด');
    }

    const data = await response.json();
    const cityName = provinceNames[coordString];

    displayResult(data, cityName, selectedUserType);
    saveLastCheck(data, cityName, selectedUserType);

  } catch (error) {
    console.error('Error:', error);
    showState('error');
  }
}

function displayResult(data, cityName, selectedUserType) {
  const pm25 = data.current.pm2_5;
  const pm10 = data.current.pm10;
  const aqi = data.current.us_aqi;
  const status = getAQIStatus(aqi);

  document.querySelector('#cityName').textContent = cityName;
  document.querySelector('#updateTime').textContent =
    'อัปเดตเมื่อ: ' + new Date().toLocaleString('th-TH');

  document.querySelector('#aqiValue').textContent = aqi;
  document.querySelector('#aqiLevel').textContent = status.level;

  const banner = document.querySelector('#aqiBanner');
  banner.className = 'aqi-banner level-' + status.color;

  document.querySelector('#pm25').textContent = pm25;
  document.querySelector('#pm10').textContent = pm10;

  document.querySelector('#recommendation').textContent =
    getRecommendation(aqi, selectedUserType);

  showState('result');
}

// ฟังก์ชันจัดระดับ US AQI ตามตารางในโจทย์
function getAQIStatus(aqi) {
  if (aqi === null || aqi === undefined || isNaN(aqi)) {
    return { level: 'ไม่มีข้อมูล', color: 'green' };
  }
  if (aqi <= 50) return { level: 'ดี', color: 'green' };
  if (aqi <= 100) return { level: 'ปานกลาง', color: 'yellow' };
  if (aqi <= 150) return { level: 'มีผลต่อกลุ่มเสี่ยง', color: 'orange' };
  if (aqi <= 200) return { level: 'มีผลต่อสุขภาพ', color: 'red' };
  if (aqi <= 300) return { level: 'มีผลต่อสุขภาพมาก', color: 'purple' };
  return { level: 'อันตราย', color: 'brown' };
}

// คำแนะนำตามระดับ AQI + ประเภทผู้ใช้ (ไม่วินิจฉัยโรค ระบุว่าเป็นข้อมูลเบื้องต้น)
function getRecommendation(aqi, selectedUserType) {
  const status = getAQIStatus(aqi);
  const level = status.level;

  const baseAdvice = {
    'ดี': 'คุณภาพอากาศดี ทำกิจกรรมกลางแจ้งได้ตามปกติ',
    'ปานกลาง': 'คุณภาพอากาศปานกลาง กลุ่มเสี่ยงควรสังเกตอาการหากทำกิจกรรมนาน',
    'มีผลต่อกลุ่มเสี่ยง': 'กลุ่มเสี่ยงควรลดกิจกรรมกลางแจ้งที่หนัก',
    'มีผลต่อสุขภาพ': 'ควรลดกิจกรรมกลางแจ้ง สวมหน้ากากอนามัยหากจำเป็นต้องออกนอกอาคาร',
    'มีผลต่อสุขภาพมาก': 'ควรหลีกเลี่ยงกิจกรรมกลางแจ้งทุกประเภท',
    'อันตราย': 'ควรอยู่ในอาคารและหลีกเลี่ยงการออกนอกอาคารโดยไม่จำเป็น',
    'ไม่มีข้อมูล': 'ไม่สามารถประเมินได้ในขณะนี้'
  };

  const extraByUserType = {
    general: '',
    children: (aqi > 100) ? ' เด็กควรงดกิจกรรมกลางแจ้งที่ใช้แรงมาก' : '',
    elderly: (aqi > 100) ? ' ผู้สูงอายุควรพักผ่อนในที่ร่มและดื่มน้ำให้เพียงพอ' : '',
    respiratory: (aqi > 50) ? ' ผู้มีโรคทางเดินหายใจควรพกยาประจำตัวและสังเกตอาการอย่างใกล้ชิด' : ''
  };

  return baseAdvice[level] + (extraByUserType[selectedUserType] || '') +
    ' (ข้อมูลเบื้องต้น ไม่ใช่คำวินิจฉัยทางการแพทย์)';
}

function showState(state) {
  loadingState.classList.add('hidden');
  errorState.classList.add('hidden');
  emptyState.classList.add('hidden');
  resultCard.classList.add('hidden');

  if (state === 'loading') loadingState.classList.remove('hidden');
  if (state === 'error') errorState.classList.remove('hidden');
  if (state === 'empty') emptyState.classList.remove('hidden');
  if (state === 'result') resultCard.classList.remove('hidden');
}

// บันทึกผลการตรวจสอบล่าสุดด้วย localStorage
function saveLastCheck(data, cityName, selectedUserType) {
  const record = {
    city: cityName,
    aqi: data.current.us_aqi,
    pm25: data.current.pm2_5,
    pm10: data.current.pm10,
    userType: selectedUserType,
    time: new Date().toLocaleString('th-TH')
  };
  localStorage.setItem('lastAirQualityCheck', JSON.stringify(record));
}

function loadLastCheck() {
  const saved = localStorage.getItem('lastAirQualityCheck');
  if (!saved) return;

  const record = JSON.parse(saved);
  lastCheckText.textContent =
    `${record.city} | AQI: ${record.aqi} | PM2.5: ${record.pm25} | ตรวจสอบเมื่อ ${record.time}`;
  lastCheckSection.classList.remove('hidden');
}

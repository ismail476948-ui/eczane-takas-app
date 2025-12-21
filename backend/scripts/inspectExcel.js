const xlsx = require('xlsx');
const path = require('path');

const inspectExcel = () => {
    try {
        const filePath = path.join(__dirname, '../ilaçlistesi.xlsx');
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        if (data.length > 0) {
            console.log('Excel Sütun Başlıkları:', JSON.stringify(Object.keys(data[0])));
            console.log('İlk satır verisi (Yazılış):', JSON.stringify(data[0], null, 2));
        } else {
            console.log('Excel dosyası boş görünüyor.');
        }
    } catch (err) {
        console.error('Hata:', err);
    }
};

inspectExcel();

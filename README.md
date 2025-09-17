# Business Expense Tracker

A mobile-friendly web application designed for UK small businesses to track expenses, upload receipts, and manage financial data for easy sharing with accountants.

## Features

### 📱 Mobile-First Design
- Responsive design optimized for mobile devices
- Touch-friendly interface with large buttons and easy navigation
- Works on smartphones, tablets, and desktop computers

### 📊 Dashboard & Statistics
- Real-time overview of income, expenses, and net profit
- Interactive monthly charts showing income vs expenses trends
- Recent transactions display
- Category-based expense breakdown

### 📷 Receipt Management
- Take photos of receipts using device camera
- Upload existing receipt images
- Automatic expense entry from receipt data
- Thumbnail gallery of all receipts

### 💰 Transaction Tracking
- Manual entry of income and expenses
- UK business-specific categories
- Multiple payment method tracking
- Date-based filtering and sorting

### 📤 Export & Sharing
- CSV export for spreadsheet software
- Summary reports with category breakdowns
- Receipt package creation for accountants
- Date range filtering for exports

## Getting Started

### Installation
1. Download all files to your device
2. Open `index.html` in a web browser
3. For best mobile experience, add to home screen

### Usage

#### Adding Transactions
1. Tap "Add Entry" in the bottom navigation
2. Choose between Income or Expense
3. Fill in amount, category, description, and date
4. Select payment method
5. Tap "Save Transaction"

#### Uploading Receipts
1. Tap "Receipts" in the bottom navigation
2. Tap the upload area to take a photo or select an image
3. Enter receipt details (amount, category, description)
4. Tap "Save Receipt" - this also creates a transaction automatically

#### Viewing Statistics
1. Tap "Dashboard" to see your financial overview
2. View total income, expenses, and net profit
3. Check the monthly chart for trends
4. Review recent transactions

#### Exporting Data
1. Tap "Export" in the bottom navigation
2. Choose from CSV export, summary report, or receipt package
3. Set date range if needed
4. Files will be downloaded to your device

## Categories

### Expense Categories
- Office Supplies
- Travel & Transport
- Meals & Entertainment
- Utilities
- Marketing
- Professional Services
- Equipment
- Rent & Premises
- Insurance
- Other Expenses

### Income Categories
- Sales Revenue
- Service Income
- Consulting
- Interest Income
- Other Income

## Data Storage

All data is stored locally on your device using browser local storage. This means:
- ✅ Your data stays private and secure
- ✅ Works offline after initial load
- ⚠️ Data is tied to the specific browser/device
- ⚠️ Clearing browser data will remove all transactions

## Browser Compatibility

- ✅ Chrome (recommended for mobile)
- ✅ Safari (iOS)
- ✅ Firefox
- ✅ Edge
- ⚠️ Internet Explorer not supported

## Tips for UK Businesses

### For Your Accountant
- Export CSV files monthly for easy import into accounting software
- Use the summary report for tax return preparation
- Package receipts for HMRC compliance
- Keep consistent category usage for better reporting

### HMRC Compliance
- Take clear, readable photos of all receipts
- Include VAT receipts where applicable
- Record business mileage in Travel & Transport
- Separate business and personal expenses

### Best Practices
- Enter transactions daily for better accuracy
- Use descriptive transaction descriptions
- Keep receipt photos for at least 6 years
- Regular backups by exporting data

## Technical Details

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Charts**: Chart.js library
- **Icons**: Font Awesome
- **Storage**: Browser Local Storage
- **No server required**: Runs entirely in the browser

## File Structure
```
/
├── index.html          # Main application file
├── styles.css          # Mobile-responsive styles
├── app.js             # Application logic
└── README.md          # This file
```

## Support

This application is designed to work offline and requires no internet connection after the initial load. All data is stored locally on your device for privacy and security.

For best results:
- Use on a modern smartphone or tablet
- Ensure good lighting when taking receipt photos
- Regularly export your data as backup
- Add the app to your home screen for easy access

## License

This is a standalone application created for small business expense tracking. Feel free to modify and adapt for your specific needs.

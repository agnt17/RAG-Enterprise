import { createContext, useContext, useState, useEffect } from "react"

const LanguageContext = createContext()

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider")
  }
  return context
}

const translations = {
  en: {
    // Navigation
    settings: "Settings",
    language: "Language",
    getHelp: "Get help",
    upgradePlan: "Upgrade plan",
    logout: "Log out",
    
    // Settings Page
    settingsTitle: "Settings",
    profilePhoto: "Profile Photo",
    changeDetails: "Change Details",
    uploadPhoto: "Upload Photo",
    removePhoto: "Remove Photo",
    name: "Name",
    email: "Email",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmPassword: "Confirm Password",
    saveChanges: "Save Changes",
    cancel: "Cancel",
    
    // Help Page
    helpTitle: "Help & Support",
    helpDescription: "Get help with your account and learn how to use the platform",
    faqTitle: "Frequently Asked Questions",
    contactTitle: "Contact Support",
    contactDescription: "Need more help? Reach out to our support team",
    
    // Upgrade Page
    upgradeTitle: "Upgrade Your Plan",
    upgradeDescription: "Choose the perfect plan for your needs",
    currentPlan: "Current Plan",
    free: "Free",
    basic: "Basic",
    pro: "Pro",
    enterprise: "Enterprise",
    perMonth: "/ month",
    selectPlan: "Select Plan",
    popular: "Popular",
    
    // Common
    back: "Back",
    home: "Home",
    close: "Close",
  },
  hi: {
    // Navigation
    settings: "सेटिंग्स",
    language: "भाषा",
    getHelp: "सहायता प्राप्त करें",
    upgradePlan: "प्लान अपग्रेड करें",
    logout: "लॉग आउट",
    
    // Settings Page
    settingsTitle: "सेटिंग्स",
    profilePhoto: "प्रोफ़ाइल फ़ोटो",
    changeDetails: "विवरण बदलें",
    uploadPhoto: "फ़ोटो अपलोड करें",
    removePhoto: "फ़ोटो हटाएं",
    name: "नाम",
    email: "ईमेल",
    currentPassword: "वर्तमान पासवर्ड",
    newPassword: "नया पासवर्ड",
    confirmPassword: "पासवर्ड की पुष्टि करें",
    saveChanges: "परिवर्तन सहेजें",
    cancel: "रद्द करें",
    
    // Help Page
    helpTitle: "सहायता और समर्थन",
    helpDescription: "अपने खाते में सहायता प्राप्त करें और प्लेटफ़ॉर्म का उपयोग करना सीखें",
    faqTitle: "अक्सर पूछे जाने वाले प्रश्न",
    contactTitle: "समर्थन से संपर्क करें",
    contactDescription: "अधिक सहायता चाहिए? हमारी समर्थन टीम से संपर्क करें",
    
    // Upgrade Page
    upgradeTitle: "अपना प्लान अपग्रेड करें",
    upgradeDescription: "अपनी आवश्यकताओं के लिए सही प्लान चुनें",
    currentPlan: "वर्तमान प्लान",
    free: "मुफ़्त",
    basic: "बेसिक",
    pro: "प्रो",
    enterprise: "एंटरप्राइज़",
    perMonth: "/ माह",
    selectPlan: "प्लान चुनें",
    popular: "लोकप्रिय",
    
    // Common
    back: "वापस",
    home: "होम",
    close: "बंद करें",
  }
}

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("language") || "en"
  })

  useEffect(() => {
    localStorage.setItem("language", language)
  }, [language])

  const t = (key) => {
    return translations[language][key] || key
  }

  const value = {
    language,
    setLanguage,
    t
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

import { useState } from "react"
import { useNavigate } from "react-router-dom"

const IconArrowLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
)

const IconChevronDown = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const IconMail = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
)

const IconMessageCircle = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
)

const IconBook = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
)

function FAQItem({ question, answer, isDark }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={`border rounded-xl overflow-hidden ${isDark ? "border-white/[0.08]" : "border-slate-200/50"}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors cursor-pointer
          ${isDark ? "hover:bg-white/[0.06]" : "hover:bg-white/40"}`}
      >
        <span className={`font-medium ${isDark ? "text-gray-200" : "text-slate-900"}`}>
          {question}
        </span>
        <span className={`transition-transform ${isOpen ? "rotate-180" : ""} ${isDark ? "text-white" : "text-slate-700"}`}>
          <IconChevronDown />
        </span>
      </button>
      {isOpen && (
        <div className={`px-5 py-4 border-t ${isDark ? "border-white/[0.08] bg-white/[0.04]" : "border-slate-100/80 bg-white/40"}`}>
          <p className={`text-sm leading-relaxed ${isDark ? "text-gray-400" : "text-slate-600"}`}>
            {answer}
          </p>
        </div>
      )}
    </div>
  )
}

export default function HelpPage({ theme }) {
  const navigate = useNavigate()
  const isDark = theme === "dark"

  const faqs = [
    {
      question: "How do I upload documents?",
      answer: "To upload documents, click the \"Upload\" button on the main chat interface. You can also drag and drop PDF files. Once the file is uploaded, the system will process it and you can start asking questions about its content."
    },
    {
      question: "How can I switch between documents?",
      answer: "View all your uploaded documents in the sidebar. Click on any document to load it into the chat context. The active document will be highlighted."
    },
    {
      question: "How secure is my data?",
      answer: "Your data is highly secure. All documents are encrypted and tied to your account. We use industry-standard security protocols and never share your data without your permission."
    },
    {
      question: "Can I delete my documents?",
      answer: "Yes, you can delete your documents at any time. Click the three-dot menu next to a document and select \"Delete\". This will permanently remove the document and all its associated data from your account."
    },
    {
      question: "What file formats are supported?",
      answer: "Currently, we support PDF documents. We're working on adding more file formats soon."
    },
    {
      question: "What is the file size limit per document?",
      answer: "The free plan allows uploading files up to 10 MB. Premium plans have higher file size limits."
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b ${isDark ? "bg-black/20 backdrop-blur-xl border-white/[0.08]" : "bg-white/70 backdrop-blur-xl border-slate-200/50"}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => navigate("/")}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer
              ${isDark ? "hover:bg-gray-800 text-white" : "hover:bg-slate-100 text-slate-700"}`}
          >
            <IconArrowLeft />
          </button>
          <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
            Help & Support
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Hero Section */}
        <div className="mb-8 sm:mb-12 text-center">
          <p className={`text-lg ${isDark ? "text-gray-400" : "text-slate-600"}`}>
            Get help with your account and learn how to use the platform
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-12">
          <div className={`rounded-2xl border p-5 sm:p-6 text-center ${isDark ? "bg-white/[0.06] backdrop-blur-md border-white/[0.08]" : "bg-white/80 backdrop-blur-md border-slate-200/50"}`}>
            <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center
              ${isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
              <IconMail />
            </div>
            <h3 className={`font-semibold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
              Email
            </h3>
            <p className={`text-sm mb-3 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
              Send us an email
            </p>
            <a
              href="mailto:adityagupta20042003@gmail.com"
              className={`text-sm font-medium cursor-pointer ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
            >
              adityagupta20042003@gmail.com
            </a>
          </div>

          <div className={`rounded-2xl border p-5 sm:p-6 text-center ${isDark ? "bg-white/[0.06] backdrop-blur-md border-white/[0.08]" : "bg-white/80 backdrop-blur-md border-slate-200/50"}`}>
            <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center
              ${isDark ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-600"}`}>
              <IconMessageCircle />
            </div>
            <h3 className={`font-semibold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
              Live Chat
            </h3>
            <p className={`text-sm mb-3 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
              Chat with our team
            </p>
            <button className={`text-sm font-medium cursor-pointer ${isDark ? "text-green-400 hover:text-green-300" : "text-green-600 hover:text-green-700"}`}>
             <a href="https://wa.me/+916306842151">Start Chat</a>
            </button>
          </div>

          <div className={`rounded-2xl border p-5 sm:p-6 text-center ${isDark ? "bg-white/[0.06] backdrop-blur-md border-white/[0.08]" : "bg-white/80 backdrop-blur-md border-slate-200/50"}`}>
            <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center
              ${isDark ? "bg-purple-900/30 text-purple-400" : "bg-purple-100 text-purple-600"}`}>
              <IconBook />
            </div>
            <h3 className={`font-semibold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
              Documentation
            </h3>
            <p className={`text-sm mb-3 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
              View detailed guides
            </p>
            <button className={`text-sm font-medium cursor-pointer ${isDark ? "text-purple-400 hover:text-purple-300" : "text-purple-600 hover:text-purple-700"}`}>
              Read Docs
            </button>
          </div>
        </div>

        {/* FAQs */}
        <div className={`rounded-2xl border p-5 sm:p-8 ${isDark ? "bg-white/[0.06] backdrop-blur-md border-white/[0.08]" : "bg-white/80 backdrop-blur-md border-slate-200/50"}`}>
          <h2 className={`text-xl font-bold mb-6 ${isDark ? "text-white" : "text-slate-900"}`}>
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isDark={isDark}
              />
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className={`mt-8 rounded-2xl border p-5 sm:p-8 text-center ${isDark ? "bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-800/30" : "bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200"}`}>
          <h3 className={`text-xl font-bold mb-3 ${isDark ? "text-white" : "text-slate-900"}`}>
            Contact Support
          </h3>
          <p className={`mb-6 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
            Need more help? Reach out to our support team
          </p>
          <button className={`px-8 py-3 rounded-lg font-medium transition-colors cursor-pointer
            w-full sm:w-auto ${isDark ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
            <a href="mailto:adityagupta20042003@gmail.com">Contact Support</a>
          </button>
        </div>
      </div>
    </div>
  )
}

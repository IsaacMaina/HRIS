export default function AdminSettings() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">System Settings</h1>
          
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Tax Configurations</h2>
              <form className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="paye-rate" className="block text-sm font-medium text-gray-700 mb-1">
                      PAYE Rate (%)
                    </label>
                    <input
                      type="number"
                      id="paye-rate"
                      defaultValue="30"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="nhif-rate" className="block text-sm font-medium text-gray-700 mb-1">
                      NHIF Rate (KSH)
                    </label>
                    <input
                      type="number"
                      id="nhif-rate"
                      defaultValue="1000"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="nssf-rate" className="block text-sm font-medium text-gray-700 mb-1">
                      NSSF Rate (KSH)
                    </label>
                    <input
                      type="number"
                      id="nssf-rate"
                      defaultValue="800"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="other-deductions" className="block text-sm font-medium text-gray-700 mb-1">
                      Other Deductions (KSH)
                    </label>
                    <input
                      type="number"
                      id="other-deductions"
                      defaultValue="500"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div className="pt-4">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Save Tax Settings
                  </button>
                </div>
              </form>
            </div>
            
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Banking Information</h2>
              <form className="space-y-4">
                <div>
                  <label htmlFor="bank-accounts" className="block text-sm font-medium text-gray-700 mb-1">
                    Supported Banks
                  </label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center">
                      <input
                        id="equity"
                        name="banks[]"
                        type="checkbox"
                        defaultChecked
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="equity" className="ml-2 block text-sm text-gray-900">
                        Equity Bank
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="kcb"
                        name="banks[]"
                        type="checkbox"
                        defaultChecked
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="kcb" className="ml-2 block text-sm text-gray-900">
                        KCB Bank
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="cooperative"
                        name="banks[]"
                        type="checkbox"
                        defaultChecked
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="cooperative" className="ml-2 block text-sm text-gray-900">
                        Co-operative Bank
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="family"
                        name="banks[]"
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="family" className="ml-2 block text-sm text-gray-900">
                        Family Bank
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Save Banking Settings
                  </button>
                </div>
              </form>
            </div>
            
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Payment Gateways</h2>
              <div className="space-y-8">
                <div>
                  <h3 className="text-md font-medium text-gray-800 mb-2">Safaricom Daraja</h3>
                  <form className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="daraja-consumer-key" className="block text-sm font-medium text-gray-700 mb-1">
                          Daraja Consumer Key
                        </label>
                        <input
                          type="password"
                          id="daraja-consumer-key"
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Consumer Key"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="daraja-consumer-secret" className="block text-sm font-medium text-gray-700 mb-1">
                          Daraja Consumer Secret
                        </label>
                        <input
                          type="password"
                          id="daraja-consumer-secret"
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Consumer Secret"
                        />
                      </div>

                      <div>
                        <label htmlFor="daraja-shortcode" className="block text-sm font-medium text-gray-700 mb-1">
                          Daraja Business Shortcode
                        </label>
                        <input
                          type="text"
                          id="daraja-shortcode"
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Business Shortcode"
                        />
                      </div>

                      <div>
                        <label htmlFor="daraja-passkey" className="block text-sm font-medium text-gray-700 mb-1">
                          Daraja Passkey
                        </label>
                        <input
                          type="password"
                          id="daraja-passkey"
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Passkey"
                        />
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <button
                        type="button"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Save Daraja Settings
                      </button>
                    </div>
                  </form>
                </div>
                <div className="border-t border-gray-200 pt-8">
                  <h3 className="text-md font-medium text-gray-800 mb-2">Flutterwave</h3>
                  <form className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="flutterwave-public-key" className="block text-sm font-medium text-gray-700 mb-1">
                          Flutterwave Public Key
                        </label>
                        <input
                          type="password"
                          id="flutterwave-public-key"
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Public key"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="flutterwave-secret-key" className="block text-sm font-medium text-gray-700 mb-1">
                          Flutterwave Secret Key
                        </label>
                        <input
                          type="password"
                          id="flutterwave-secret-key"
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Secret key"
                        />
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <button
                        type="button"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Save Flutterwave Settings
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">System Preferences</h2>
              <form className="space-y-4">
                <div>
                  <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="company-name"
                    defaultValue="Kaimosi Friends University"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      id="currency"
                      className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option>KSH - Kenyan Shilling</option>
                      <option>USD - US Dollar</option>
                      <option>EUR - Euro</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
                      Timezone
                    </label>
                    <select
                      id="timezone"
                      className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option>Africa/Nairobi</option>
                      <option>Africa/Kampala</option>
                      <option>Africa/Dar_es_Salaam</option>
                    </select>
                  </div>
                </div>
                
                <div className="pt-4">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Save System Settings
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
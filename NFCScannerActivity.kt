// NFCScannerActivity.kt
class NFCScannerActivity : AppCompatActivity() {

    private lateinit var nfcAdapter: NfcAdapter
    private val apiUrl = "https://rfidcard.cards/api"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_scanner)

        nfcAdapter = NfcAdapter.getDefaultAdapter(this)

        if (nfcAdapter == null) {
            Toast.makeText(this, "NFC not supported", Toast.LENGTH_SHORT).show()
            finish()
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (NfcAdapter.ACTION_NDEF_DISCOVERED == intent.action) {
            val tag = intent.getParcelableExtra<Tag>(NfcAdapter.EXTRA_TAG)
            val tagUID = tag.id.toHexString()

            // Send UID to backend for validation
            validateTag(tagUID)
        }
    }

    private fun validateTag(tagUID: String) {
        val client = OkHttpClient()
        val json = JSONObject().apply {
            put("tagUID", tagUID)
        }

        val request = Request.Builder()
            .url("$apiUrl/api/tags/validate")
            .addHeader("Authorization", "Bearer $JWT_TOKEN")
            .post(json.toString().toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                runOnUiThread {
                    Toast.makeText(this@NFCScannerActivity, 
                        "❌ Access Denied", Toast.LENGTH_LONG).show()
                }
            }

            override fun onResponse(call: Call, response: Response) {
                val result = JSONObject(response.body!!.string())
                runOnUiThread {
                    if (result.getBoolean("valid")) {
                        Toast.makeText(this@NFCScannerActivity,
                            "✅ Welcome, ${result.getString("owner")}",
                            Toast.LENGTH_LONG).show()
                    } else {
                        Toast.makeText(this@NFCScannerActivity,
                            "❌ Unauthorized Tag", Toast.LENGTH_LONG).show()
                    }
                }
            }
        })
    }
}

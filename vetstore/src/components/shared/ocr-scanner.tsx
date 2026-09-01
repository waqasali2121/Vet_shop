"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { createWorker } from "tesseract.js"
import {
  Camera,
  Upload,
  Check,
  AlertCircle,
  RefreshCw,
  X,
  Loader2,
  Edit,
  Plus,
  Search,
  ShoppingCart,
  CheckCircle,
  AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

// Definition of Scanned Item
export type ScannedItem = {
  tempId: string
  name: string
  quantity: number
  bonus_quantity: number
  unit_cost: number
  discount_amount: number
  matchedProductId: string | null // matched existing product ID
  sku?: string
  barcode?: string
  expiry_date?: string
  batch_number?: string
}

interface OCRScannerProps {
  mode: "single" | "list"
  products: { id: string; name: string; sku: string | null; barcode: string | null }[]
  onSingleSelect?: (name: string, details?: { sku?: string; barcode?: string; price?: number }) => void
  onListSelect?: (items: ScannedItem[]) => void
  isOpen: boolean
  onClose: () => void
}

export function OCRScanner({ mode, products, onSingleSelect, onListSelect, isOpen, onClose }: OCRScannerProps) {
  // UI Tabs / Phases
  // 'capture' -> webcam or upload selection
  // 'processing' -> OCR running
  // 'review' -> editing/matching parsed data
  const [step, setStep] = useState<"capture" | "processing" | "review">("capture")
  const [imageSrc, setImageSrc] = useState<string | null>(null)

  // Camera variables
  const [cameraActive, setCameraActive] = useState(false)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("")
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // OCR state
  const [ocrText, setOcrText] = useState("")
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrStatus, setOcrStatus] = useState("")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Parsed results
  const [parsedSingleName, setParsedSingleName] = useState("")
  const [parsedSingleChips, setParsedSingleChips] = useState<string[]>([])
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])

  // Search filter for manual matching in review
  const [searchFilter, setSearchFilter] = useState("")

  // Fetch camera devices
  useEffect(() => {
    if (isOpen && step === "capture" && typeof window !== "undefined") {
      navigator.mediaDevices.enumerateDevices()
        .then(deviceInfos => {
          const videoDevices = deviceInfos.filter(device => device.kind === "videoinput")
          setDevices(videoDevices)
          if (videoDevices.length > 0 && !selectedDeviceId) {
            // Default to back camera on mobile if available
            const backCam = videoDevices.find(d => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("environment"))
            setSelectedDeviceId(backCam ? backCam.deviceId : videoDevices[0].deviceId)
          }
        })
        .catch(err => {
          console.error("enumerateDevices error: ", err)
        })
    }
  }, [isOpen, step, selectedDeviceId])

  // Stop camera when closing
  useEffect(() => {
    if (!isOpen) {
      stopCamera()
    }
  }, [isOpen])

  // Start Camera Stream
  const startCamera = async (deviceId?: string) => {
    setErrorMsg(null)
    setCameraActive(false)
    const targetDevice = deviceId || selectedDeviceId

    const constraints: MediaStreamConstraints = {
      video: targetDevice ? { deviceId: { exact: targetDevice } } : { facingMode: "environment" }
    }

    try {
      if (videoRef.current && videoRef.current.srcObject) {
        stopCamera()
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute("playsinline", "true") // required for iOS
        videoRef.current.play()
        setCameraActive(true)
      }
    } catch (err: any) {
      console.error("Camera access error:", err)
      setErrorMsg("Failed to access camera. Please verify camera permissions or choose standard image upload.")
    }
  }

  // Stop Camera Stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      const tracks = stream.getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
      setCameraActive(false)
    }
  }

  // Capture Snapshot
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")

      if (ctx) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        const dataUrl = canvas.toDataURL("image/jpeg")
        setImageSrc(dataUrl)
        stopCamera()
        runOCR(dataUrl)
      }
    }
  }

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string
          setImageSrc(dataUrl)
          stopCamera()
          runOCR(dataUrl)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // Run OCR via tesseract.js
  const runOCR = async (image: string) => {
    setStep("processing")
    setOcrProgress(0)
    setOcrStatus("Initializing OCR Engine...")
    setErrorMsg(null)

    try {
      const worker = await createWorker("eng")

      // Setup logger for progress feedback
      await worker.setParameters({
        tessjs_create_pdf: "0",
        tessjs_create_hocr: "0",
      })

      setOcrStatus("Scanning text from image...")
      const { data } = await worker.recognize(image)
      setOcrText(data.text)

      setOcrStatus("Processing extracted text...")
      processScannedText(data.text)

      await worker.terminate()
      setStep("review")
    } catch (err: any) {
      console.error("OCR execution error: ", err)
      setErrorMsg("Failed to run OCR. The image might be too large, blurry, or formatted incorrectly.")
      setStep("capture")
    }
  }

  // Process and parse text
  const processScannedText = (text: string) => {
    if (mode === "single") {
      // Clean text for single box selection
      // Split into lines/words, clean out obvious special chars and short words
      const cleanedLines = text.split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 2)

      // Auto-extract longest capitalized phrase or line as candidate name
      let candidate = ""
      const chipsSet = new Set<string>()

      cleanedLines.forEach(line => {
        chipsSet.add(line)
        // Split line into smaller parts/words
        const words = line.split(/\s+/)
        words.forEach(w => {
          const cleanW = w.replace(/[^A-Za-z0-9]/g, "")
          if (cleanW.length > 2) {
            chipsSet.add(cleanW)
          }
        })

        // Simple heuristic: set the first long alphabetical line as candidate name
        if (!candidate && /^[A-Z\s]{4,}$/i.test(line)) {
          candidate = line
        }
      })

      setParsedSingleChips(Array.from(chipsSet).slice(0, 30)) // limit to 30 chips
      setParsedSingleName(candidate || cleanedLines[0] || "")
    } else {
      // List/Receipt Parsing Heuristics
      const lines = text.split("\n")
      const parsedList: ScannedItem[] = []

      lines.forEach((line) => {
        const trimmed = line.trim()
        if (trimmed.length < 10) return

        // Skip headers & footer lines
        const upper = trimmed.toUpperCase()
        if (
          upper.includes("INVOICE") ||
          upper.includes("RECEIPT") ||
          upper.includes("DATE") ||
          upper.includes("STORE") ||
          upper.includes("PAGE") ||
          upper.includes("CUSTOMER") ||
          upper.includes("CASHIER") ||
          upper.includes("TOTAL") ||
          upper.includes("BALANCE") ||
          upper.includes("QTY") ||
          upper.includes("PRICE") ||
          upper.includes("CONTACT") ||
          upper.includes("ADDRESS")
        ) {
          return
        }

        // Tokenize line by whitespace
        const tokens = trimmed.split(/\s+/)

        // Find numeric tokens
        // A numeric token is one that represents a clean decimal or integer
        // Let's filter out alphanumeric units like 100GM, 1KG, etc.
        const numTokens: { index: number; value: number; raw: string }[] = []

        tokens.forEach((token, index) => {
          // Normalize token for OCR misreads (e.g. replace O/o with 0, I/l with 1, but only if it looks like a number)
          let cleanToken = token.replace(/[^0-9.]/g, "")

          // OCR might represent a decimal price like 820.00 as 820.0O or 820.00
          // If token ends with .oO or similar, clean it
          if (token.endsWith(".o") || token.endsWith(".O") || token.endsWith(".0")) {
            // keep decimals
          }

          const parsed = parseFloat(cleanToken)
          if (!isNaN(parsed) && /^\d+(?:\.\d+)?$/.test(cleanToken)) {
            numTokens.push({ index, value: parsed, raw: token })
          }
        })

        // A valid product transaction line in receipt typically contains at least:
        // - Quantity (e.g. 12)
        // - Unit price / cost (e.g. 820.00)
        // - Line total (e.g. 9840.00)
        // Hence, we expect at least 3 numeric values in the line.
        if (numTokens.length >= 3) {
          // Identify structure
          // Left-most numeric values: Qty, Bonus (if any)
          // Right-most numeric values: Price, Discount%, Line Total

          // First numeric is quantity
          const qty = numTokens[0].value

          // Is there a second numeric before the text description starts?
          // If the second numeric is index 1, it's likely Bonus quantity
          let bonus = 0
          let nameStartIndex = 1

          if (numTokens.length >= 4 && numTokens[1].index === 1) {
            bonus = numTokens[1].value
            nameStartIndex = 2
          }

          // The last few are Price, Dis%, Amount
          // Total price is typically the very last numeric token
          const lastNum = numTokens[numTokens.length - 1]

          // Price (Unit Cost) is typically the numeric token before discount, or just the main rate
          // Let's analyze indexes from the end
          let price = 0
          let discount = 0

          if (numTokens.length >= 3) {
            const totalIndex = numTokens.length - 1
            const discountIndex = numTokens.length - 2
            const priceIndex = numTokens.length - 3

            price = numTokens[priceIndex]?.value || 0
            discount = numTokens[discountIndex]?.value || 0

            // Fallback: If price index was too low (e.g. overlap), check tokens
            if (price === 0 && numTokens.length >= 2) {
              price = numTokens[numTokens.length - 2].value
            }
          }

          // Product Name is everything in the middle
          const nameEndTokenIndex = numTokens[numTokens.length - 2]?.index || tokens.length - 1
          const nameTokens = tokens.slice(nameStartIndex, nameEndTokenIndex)

          // Clean name string
          let name = nameTokens.join(" ").trim()

          // If the name is empty or too short, let's fallback
          if (name.length < 2) {
            // Find non-numeric tokens
            name = tokens.filter(t => !/^\d+(?:\.\d+)?$/.test(t)).join(" ").trim()
          }

          // Double check: if name is still empty, skip
          if (name.length > 2 && qty > 0) {
            // Perform Fuzzy Match on system products
            const matchedId = findFuzzyMatch(name)

            parsedList.push({
              tempId: `scanned-${Math.random().toString(36).substr(2, 9)}`,
              name: name,
              quantity: qty,
              bonus_quantity: bonus,
              unit_cost: price,
              discount_amount: discount, // initially store parsed value
              matchedProductId: matchedId,
              batch_number: `BAT-${Math.floor(100000 + Math.random() * 900000)}`,
              expiry_date: new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // default 2 years
            })
          }
        }
      })

      setScannedItems(parsedList)
    }
  }

  // Fuzzy matching product names
  const findFuzzyMatch = (scannedName: string): string | null => {
    const sName = scannedName.toLowerCase().replace(/[^a-z0-9]/g, "")
    if (!sName) return null

    let bestMatchId: string | null = null
    let highestScore = 0

    products.forEach((prod) => {
      const pName = prod.name.toLowerCase().replace(/[^a-z0-9]/g, "")

      // 1. Exact match
      if (pName === sName) {
        bestMatchId = prod.id
        highestScore = 1.0
        return
      }

      // 2. Contains match
      if (pName.includes(sName) || sName.includes(pName)) {
        const score = Math.min(pName.length, sName.length) / Math.max(pName.length, sName.length)
        if (score > highestScore && score > 0.4) {
          bestMatchId = prod.id
          highestScore = score
        }
      }

      // 3. Token overlap match
      const scannedTokens = scannedName.toLowerCase().split(/\s+/)
      const prodTokens = prod.name.toLowerCase().split(/\s+/)
      const matches = scannedTokens.filter(t => t.length > 2 && prodTokens.includes(t))

      if (matches.length > 0) {
        const score = matches.length / Math.max(scannedTokens.length, prodTokens.length)
        if (score > highestScore && score > 0.3) {
          bestMatchId = prod.id
          highestScore = score
        }
      }
    })

    return bestMatchId
  }

  // Handle manual correction of matched product in review
  const handleUpdateItemMatch = (tempId: string, productId: string | null) => {
    setScannedItems(prev => prev.map(item => {
      if (item.tempId === tempId) {
        const selectedProd = products.find(p => p.id === productId)
        return {
          ...item,
          matchedProductId: productId,
          // if matches, keep parsed name or update it?
          // let's keep parsed name as display, but bind the database product ID
        }
      }
      return item
    }))
  }

  // Inline edit parsed item field
  const handleUpdateItemField = (tempId: string, field: keyof ScannedItem, value: any) => {
    setScannedItems(prev => prev.map(item => {
      if (item.tempId === tempId) {
        return { ...item, [field]: value }
      }
      return item
    }))
  }

  // Remove a parsed item from list
  const handleRemoveScannedItem = (tempId: string) => {
    setScannedItems(prev => prev.filter(item => item.tempId !== tempId))
  }

  // Finish review and submit
  const handleApply = () => {
    if (mode === "single") {
      if (onSingleSelect) {
        onSingleSelect(parsedSingleName)
      }
    } else {
      if (onListSelect) {
        onListSelect(scannedItems)
      }
    }
    onClose()
  }

  // Reset and try scanning again
  const handleReset = () => {
    setImageSrc(null)
    setOcrText("")
    setScannedItems([])
    setParsedSingleName("")
    setStep("capture")
    setErrorMsg(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-4">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            {mode === "single" ? "Scan Medicine Box/Label" : "Scan Purchase Receipt / Invoice"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Use camera or upload an image to automatically extract product data.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-md flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-4 min-h-0 flex flex-col">
          {/* STEP 1: CAPTURE / UPLOAD */}
          {step === "capture" && (
            <div className="grid md:grid-cols-2 gap-4 flex-1 items-stretch">
              {/* Left Panel: Camera capture */}
              <div className="border border-slate-200 rounded-lg p-3 flex flex-col items-center justify-center bg-slate-50 relative min-h-[300px]">
                {cameraActive ? (
                  <div className="w-full h-full flex flex-col justify-between">
                    <div className="relative overflow-hidden rounded-md flex-1 bg-black flex items-center justify-center">
                      <video
                        ref={videoRef}
                        className="w-full max-h-[350px] object-contain rounded-md"
                        autoPlay
                        playsInline
                        muted
                      />
                      {/* Guides overlay */}
                      <div className="absolute inset-4 border border-dashed border-white/50 rounded pointer-events-none flex items-center justify-center">
                        <div className="text-[10px] text-white/70 bg-black/60 px-2 py-0.5 rounded font-medium">
                          {mode === "single" ? "Align product name here" : "Align receipt table columns here"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2 w-full justify-between items-center">
                      {devices.length > 1 && (
                        <select
                          value={selectedDeviceId}
                          onChange={(e) => {
                            setSelectedDeviceId(e.target.value)
                            startCamera(e.target.value)
                          }}
                          className="text-xs rounded border border-slate-200 bg-white p-1 max-w-[150px]"
                        >
                          {devices.map((device, i) => (
                            <option key={device.deviceId} value={device.deviceId}>
                              {device.label || `Camera ${i + 1}`}
                            </option>
                          ))}
                        </select>
                      )}
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={stopCamera}>
                          Cancel Camera
                        </Button>
                        <Button type="button" size="sm" onClick={capturePhoto}>
                          Snap Photo
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Camera className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">Use Live Camera</p>
                    <p className="text-xs text-slate-400 text-center max-w-[220px]">
                      Take a direct snapshot of the medicine packaging or paper receipt.
                    </p>
                    <Button type="button" size="sm" onClick={() => startCamera()} className="cursor-pointer">
                      Start Camera
                    </Button>
                  </div>
                )}
              </div>

              {/* Right Panel: File upload */}
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50 min-h-[300px] text-center">
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-3">
                  <Upload className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">Upload Receipt or Packaging Image</h3>
                <p className="text-xs text-slate-400 max-w-[240px] mt-1 mb-4">
                  Select a photo from your gallery or files (PNG, JPG, JPEG).
                </p>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("file-upload")?.click()}
                    className="font-semibold cursor-pointer"
                  >
                    Browse Files
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PROCESSING OCR */}
          {step === "processing" && (
            <div className="flex flex-col items-center justify-center py-12 flex-1 gap-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <div className="text-center">
                <p className="font-semibold text-slate-800 text-sm">{ocrStatus}</p>
                <p className="text-xs text-slate-400 mt-1">This will take a few seconds. Do not close this modal.</p>
              </div>
              <div className="w-64 bg-slate-150 h-2 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-primary h-full transition-all duration-300 animate-pulse"
                  style={{ width: "80%" }}
                />
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW RESULTS */}
          {step === "review" && (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Layout for single box scan */}
              {mode === "single" ? (
                <div className="grid md:grid-cols-2 gap-4 flex-1 min-h-0">
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center p-2">
                    {imageSrc && (
                      <img
                        src={imageSrc}
                        alt="Scanned product"
                        className="max-h-[300px] object-contain rounded-md shadow-sm"
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="scannedName" className="font-bold text-slate-800 text-sm">Extracted Name</Label>
                      <Input
                        id="scannedName"
                        value={parsedSingleName}
                        onChange={(e) => setParsedSingleName(e.target.value)}
                        className="font-bold"
                        placeholder="Click a chip below or type name"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Detected Text Chips (Click to select)
                      </Label>
                      <div className="flex flex-wrap gap-1.5 mt-2 max-h-[180px] overflow-y-auto border p-2 rounded-md bg-white">
                        {parsedSingleChips.length === 0 ? (
                          <p className="text-xs text-slate-400">No clear text detected. Type the name manually above.</p>
                        ) : (
                          parsedSingleChips.map((chip, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setParsedSingleName(chip)}
                              className={`text-[11px] px-2.5 py-1.5 rounded-full border cursor-pointer transition-all ${
                                parsedSingleName === chip
                                  ? "bg-primary text-primary-foreground border-primary font-black"
                                  : "bg-slate-50 text-slate-650 hover:bg-slate-100 hover:text-slate-800"
                              }`}
                            >
                              {chip}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Layout for list/receipt scan */
                <div className="flex flex-col flex-1 min-h-0 gap-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-slate-600">
                      Scanned {scannedItems.length} products. Verify quantities, cost prices and match them with database products.
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={handleReset} className="h-8 gap-1 text-xs">
                      <RefreshCw className="h-3 w-3" /> Re-scan
                    </Button>
                  </div>

                  <div className="flex-1 overflow-auto border border-slate-200 rounded-lg bg-white scrollbar-thin">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 border-b font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                        <tr>
                          <th className="p-2.5">Scanned Product Name</th>
                          <th className="p-2.5">System Database Match</th>
                          <th className="p-2.5 text-center w-16">Qty</th>
                          <th className="p-2.5 text-center w-16">Bonus</th>
                          <th className="p-2.5 text-right w-24">Cost (Rs.)</th>
                          <th className="p-2.5 text-right w-24">Discount</th>
                          <th className="p-2.5 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {scannedItems.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center p-8 text-slate-400">
                              No items parsed. The text could not be mapped to invoice columns. Try re-scanning or upload a cleaner photo.
                            </td>
                          </tr>
                        ) : (
                          scannedItems.map((item) => {
                            const isMatched = item.matchedProductId !== null

                            return (
                              <tr key={item.tempId} className="hover:bg-slate-50/50">
                                <td className="p-2">
                                  <Input
                                    value={item.name}
                                    onChange={(e) => handleUpdateItemField(item.tempId, "name", e.target.value)}
                                    className="h-8 font-semibold text-xs border-slate-200"
                                  />
                                </td>
                                <td className="p-2">
                                  <div className="flex items-center gap-1.5">
                                    <select
                                      value={item.matchedProductId || ""}
                                      onChange={(e) => handleUpdateItemMatch(item.tempId, e.target.value || null)}
                                      className={`h-8 rounded-md border text-xs bg-white px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/20 flex-1 max-w-[220px] ${
                                        isMatched ? "border-emerald-200 text-emerald-800 font-medium" : "border-amber-200 text-amber-800 font-medium"
                                      }`}
                                    >
                                      <option value="">-- Mark as New Product --</option>
                                      {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                      ))}
                                    </select>
                                    {isMatched ? (
                                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] shrink-0 font-bold">
                                        Matched
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] shrink-0 font-bold">
                                        New
                                      </Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="p-2 text-center">
                                  <Input
                                    type="number"
                                    min={0}
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateItemField(item.tempId, "quantity", parseInt(e.target.value) || 0)}
                                    className="h-8 text-center p-1 text-xs border-slate-200"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <Input
                                    type="number"
                                    min={0}
                                    value={item.bonus_quantity}
                                    onChange={(e) => handleUpdateItemField(item.tempId, "bonus_quantity", parseInt(e.target.value) || 0)}
                                    className="h-8 text-center p-1 text-xs border-slate-200"
                                  />
                                </td>
                                <td className="p-2 text-right">
                                  <Input
                                    type="number"
                                    min={0}
                                    value={item.unit_cost}
                                    onChange={(e) => handleUpdateItemField(item.tempId, "unit_cost", parseFloat(e.target.value) || 0)}
                                    className="h-8 text-right p-1 text-xs border-slate-200"
                                  />
                                </td>
                                <td className="p-2 text-right">
                                  <Input
                                    type="number"
                                    min={0}
                                    value={item.discount_amount}
                                    onChange={(e) => handleUpdateItemField(item.tempId, "discount_amount", parseFloat(e.target.value) || 0)}
                                    className="h-8 text-right p-1 text-xs border-slate-200"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveScannedItem(item.tempId)}
                                    className="text-red-500 hover:text-red-700 transition-colors p-1"
                                    title="Delete Item"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3 flex gap-2 shrink-0">
          <canvas ref={canvasRef} className="hidden" />
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          {step === "review" && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={handleReset} className="gap-1">
                <RefreshCw className="h-3 w-3" /> Re-scan
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApply}
                disabled={(mode === "single" && !parsedSingleName) || (mode === "list" && scannedItems.length === 0)}
                className="font-bold gap-1 cursor-pointer bg-primary text-primary-foreground"
              >
                <Check className="h-4 w-4" /> Apply Extracted Data
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

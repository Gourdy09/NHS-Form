"use client";

import { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";

interface FormData {
  lastName: string;
  firstName: string;
  studentId: string;
  schoolEmail: string;
  serviceDates: string[];
  serviceHours: string;
  serviceDescription: string;
  opportunityName: string;
  contactPerson: string;
  fabricationAgreement: boolean;
  studentSignature: string;
  providerSignature: string;
}

export default function NHSServiceForm() {
  const [formData, setFormData] = useState<FormData>({
    lastName: "",
    firstName: "",
    studentId: "",
    schoolEmail: "",
    serviceDates: [],
    serviceHours: "",
    serviceDescription: "",
    opportunityName: "",
    contactPerson: "",
    fabricationAgreement: false,
    studentSignature: "",
    providerSignature: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");

  // Signature pad refs
  const studentSigPad = useRef<SignatureCanvas | null>(null);
  const providerSigPad = useRef<SignatureCanvas | null>(null);

  const GOOGLE_SCRIPT_URL = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL as string;

  const opportunityOptions = [
    "External",
    "Girl Up",
    "Holiday Toy Drive",
    "NZone Sports",
    "FRI Food Drive",
    "Science National Honor Society Toy Drive",
    "Girl Up Donation Drive",
    "Rho Kappa Food Drive",
    "Key Club Sanitizer + Tissue Drive",
    "UNICEF Hygiene Drive",
    "DECA Candy Drive",
    "Keeping Elkins Clean Service Drive",
    
  ];

  const getSvgFromPad = (
    pad: SignatureCanvas | null
  ): { dataUrl?: string; rawSvg?: string } => {
    if (!pad || pad.isEmpty()) return {};
    const dataUrl = pad.toDataURL("image/svg+xml"); // "data:image/svg+xml;...<svg..."
    // Optional: extract raw <svg>...</svg>
    let rawSvg: string | undefined;
    const commaIndex = dataUrl.indexOf(",");
    if (commaIndex !== -1) {
      rawSvg = decodeURIComponent(dataUrl.slice(commaIndex + 1));
    }
    return { dataUrl, rawSvg };
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.studentId.trim())
      newErrors.studentId = "Student ID is required";
    if (!/^\d+$/.test(formData.studentId))
      newErrors.studentId = "Student ID must be a number";
    if (!formData.schoolEmail.trim())
      newErrors.schoolEmail = "School email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.schoolEmail)) {
      newErrors.schoolEmail = "Please enter a valid email address";
    }
    if (formData.serviceDates.length === 0)
      newErrors.serviceDates = "At least one service date is required";
    if (!formData.serviceHours.trim())
      newErrors.serviceHours = "Number of service hours is required";
    if (!/^\d*\.?\d+$/.test(formData.serviceHours)) {
      newErrors.serviceHours = "Service hours must be a valid number";
    }
    if (!formData.serviceDescription.trim())
      newErrors.serviceDescription = "Service description is required";
    if (!formData.opportunityName)
      newErrors.opportunityName = "Opportunity name is required";
    if (!formData.contactPerson.trim())
      newErrors.contactPerson = "Contact person information is required";
    if (!formData.fabricationAgreement)
      newErrors.fabricationAgreement = "You must agree to the NHS policy";

    // Student Signature
    const { dataUrl: studentSvgUrl /*, rawSvg: studentRawSvg */ } =
      getSvgFromPad(studentSigPad.current);
    if (studentSvgUrl) {
      // store the data URL (recommended: easiest to preview and submit)
      formData.studentSignature = studentSvgUrl;
    } else {
      newErrors.studentSignature = "Student signature is required";
    }

    // Provider Signature
    const { dataUrl: providerSvgUrl /*, rawSvg: providerRawSvg */ } =
      getSvgFromPad(providerSigPad.current);
    if (providerSvgUrl) {
      formData.providerSignature = providerSvgUrl;
    } else {
      newErrors.providerSignature = "Provider signature is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitToGoogleSheets = async (data: FormData) => {
    const payload = {
      timestamp: new Date().toISOString(),
      lastName: data.lastName,
      firstName: data.firstName,
      studentId: parseInt(data.studentId),
      schoolEmail: data.schoolEmail,
      serviceDates: data.serviceDates.join(", "),
      serviceHours: parseFloat(data.serviceHours),
      serviceDescription: data.serviceDescription,
      opportunityName: data.opportunityName,
      contactPerson: data.contactPerson,
      fabricationAgreement: data.fabricationAgreement,
      studentSignature: data.studentSignature,
      providerSignature: data.providerSignature,
    };

    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      mode: "no-cors",
    });

    return Promise.resolve();
  };

  const handleSubmit = async () => {
  setSubmitError("");
  if (!validateForm()) return;

  // 🔑 Grab fresh signatures here (not in validateForm)
  const studentSvg = studentSigPad.current?.toDataURL("image/svg+xml") ?? "";
  const providerSvg = providerSigPad.current?.toDataURL("image/svg+xml") ?? "";

  // Attach them directly
  const payload = {
    timestamp: new Date().toISOString(),
    lastName: formData.lastName,
    firstName: formData.firstName,
    studentId: parseInt(formData.studentId),
    schoolEmail: formData.schoolEmail,
    serviceDates: formData.serviceDates.join(", "),
    serviceHours: parseFloat(formData.serviceHours),
    serviceDescription: formData.serviceDescription,
    opportunityName: formData.opportunityName,
    contactPerson: formData.contactPerson,
    fabricationAgreement: formData.fabricationAgreement,
    studentSignature: studentSvg,
    providerSignature: providerSvg, // ✅ guaranteed captured here
  };

  if (!studentSvg) {
    setErrors((prev) => ({ ...prev, studentSignature: "Student signature is required" }));
    return;
  }
  if (!providerSvg) {
    setErrors((prev) => ({ ...prev, providerSignature: "Provider signature is required" }));
    return;
  }

  setIsSubmitting(true);
  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      mode: "no-cors",
    });
    setSubmitSuccess(true);
  } catch (error) {
    console.error("Submission error:", error);
    setSubmitError("Failed to submit form. Please try again later.");
  } finally {
    setIsSubmitting(false);
  }
};


  const clearSignature = (type: "student" | "provider") => {
    if (type === "student" && studentSigPad.current) {
      studentSigPad.current.clear();
    } else if (type === "provider" && providerSigPad.current) {
      providerSigPad.current.clear();
    }
  };

  const resetForm = () => {
    setSubmitSuccess(false);
    setSubmitError("");
    setFormData({
      lastName: "",
      firstName: "",
      studentId: "",
      schoolEmail: "",
      serviceDates: [],
      serviceHours: "",
      serviceDescription: "",
      opportunityName: "",
      contactPerson: "",
      fabricationAgreement: false,
      studentSignature: "",
      providerSignature: "",
    });
    setErrors({});
    studentSigPad.current?.clear();
    providerSigPad.current?.clear();
  };

  // ✅ Success Page
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-blue-800 mb-2">
            Form Submitted Successfully!
          </h2>
          <p className="text-gray-600 mb-6">
            Your NHS service hours have been recorded in the Google Sheet.
          </p>
          <button
            onClick={resetForm}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Submit Another Form
          </button>
        </div>
      </div>
    );
  }

  // ✅ Main Form
  return (
    <div className="min-h-screen bg-blue-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-800 text-white p-6">
            <h1 className="text-2xl font-bold">NHS Service Hours Form</h1>
            <p className="text-blue-100 mt-1">
              National Honor Society Community Service Documentation
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Error */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">{submitError}</p>
              </div>
            )}

            {/* Personal Info */}
            <div>
              <h2 className="text-lg font-semibold text-blue-800 border-b-2 border-yellow-500 pb-2 mb-4">
                Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-sm">{errors.lastName}</p>
                  )}
                </div>

                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-sm">{errors.firstName}</p>
                  )}
                </div>

                {/* Student ID */}
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Student ID *
                  </label>
                  <input
                    type="text"
                    value={formData.studentId}
                    onChange={(e) =>
                      setFormData({ ...formData, studentId: e.target.value })
                    }
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                  {errors.studentId && (
                    <p className="text-red-500 text-sm">{errors.studentId}</p>
                  )}
                </div>

                {/* School Email */}
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    School Email *
                  </label>
                  <input
                    type="email"
                    value={formData.schoolEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, schoolEmail: e.target.value })
                    }
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                  {errors.schoolEmail && (
                    <p className="text-red-500 text-sm">{errors.schoolEmail}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Service Info */}
            <div>
              <h2 className="text-lg font-semibold text-blue-800 border-b-2 border-yellow-500 pb-2 mb-4">
                Service Information
              </h2>
              <div className="space-y-4">
                {/* Dates */}
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Date(s) of Service *
                  </label>
                  <input
                    type="date"
                    onChange={(e) => {
                      if (
                        e.target.value &&
                        !formData.serviceDates.includes(e.target.value)
                      ) {
                        setFormData((prev) => ({
                          ...prev,
                          serviceDates: [...prev.serviceDates, e.target.value],
                        }));
                      }
                    }}
                    className="w-full md:w-1/2 p-3 border rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.serviceDates.map((date) => (
                      <span
                        key={date}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center"
                      >
                        {new Date(date).toLocaleDateString()}
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              serviceDates: prev.serviceDates.filter(
                                (d) => d !== date
                              ),
                            }))
                          }
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                  {errors.serviceDates && (
                    <p className="text-red-500 text-sm">
                      {errors.serviceDates}
                    </p>
                  )}
                </div>

                {/* Hours */}
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Service Hours *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={formData.serviceHours}
                    onChange={(e) =>
                      setFormData({ ...formData, serviceHours: e.target.value })
                    }
                    className="w-full md:w-1/2 p-3 border rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                  {errors.serviceHours && (
                    <p className="text-red-500 text-sm">
                      {errors.serviceHours}
                    </p>
                  )}
                </div>

                {/* Opportunity */}
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Opportunity Type *
                  </label>
                  <select
                    value={formData.opportunityName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        opportunityName: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">Select an opportunity</option>
                    {opportunityOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {errors.opportunityName && (
                    <p className="text-red-500 text-sm">
                      {errors.opportunityName}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.serviceDescription}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        serviceDescription: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                  {errors.serviceDescription && (
                    <p className="text-red-500 text-sm">
                      {errors.serviceDescription}
                    </p>
                  )}
                </div>

                {/* Contact Person */}
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Contact Person *
                  </label>
                  <textarea
                    value={formData.contactPerson}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactPerson: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                  {errors.contactPerson && (
                    <p className="text-red-500 text-sm">
                      {errors.contactPerson}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div>
              <h2 className="text-lg font-semibold text-blue-800 border-b-2 border-yellow-500 pb-2 mb-4">
                Electronic Signatures
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Student */}
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Student Signature *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-white">
                    <SignatureCanvas
                      ref={studentSigPad}
                      penColor="black"
                      canvasProps={{
                        width: 300,
                        height: 120,
                        className: "w-full h-32",
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => clearSignature("student")}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Clear
                  </button>
                  {errors.studentSignature && (
                    <p className="text-red-500 text-sm">
                      {errors.studentSignature}
                    </p>
                  )}
                </div>

                {/* Provider */}
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Provider Signature *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-white">
                    <SignatureCanvas
                      ref={providerSigPad}
                      penColor="black"
                      canvasProps={{
                        width: 300,
                        height: 120,
                        className: "w-full h-32",
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => clearSignature("provider")}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Clear
                  </button>
                  {errors.providerSignature && (
                    <p className="text-red-500 text-sm">
                      {errors.providerSignature}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Agreement */}
            <div className="flex items-start">
              <input
                type="checkbox"
                checked={formData.fabricationAgreement}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    fabricationAgreement: e.target.checked,
                  })
                }
                className="mt-1 mr-2"
              />
              <label className="text-sm text-gray-700">
                I verify that the information provided is accurate and complies
                with NHS service policies. I understand that if I am found
                fabricating service hours I face complete removal from NHS.
              </label>
            </div>
            {errors.fabricationAgreement && (
              <p className="text-red-500 text-sm">
                {errors.fabricationAgreement}
              </p>
            )}

            {/* Submit */}
            <div className="pt-4 border-t">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit Form"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

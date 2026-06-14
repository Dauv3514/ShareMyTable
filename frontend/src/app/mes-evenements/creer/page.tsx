"use client";

import axios from "axios";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CookingPot,
  NotebookText,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import DatePickerField from "@/components/DatePicker";
import TimePickerField from "@/components/TimePicker";
import { MOCK_MEAL_FILTER_GROUPS } from "@/lib/data/mocks/meal-filters";
import { useAuth } from "../../providers/AuthProvider";
import styles from "./creer-repas.module.scss";

type WizardStep = 0 | 1 | 2 | 3 | 4;
type MealStatus = "draft" | "published" | "cancelled" | "done";

type HostProfileSummary = {
  address: string;
  city: string;
  districtLabel: string;
  country: string;
  validationStatus: "pending" | "approved" | "rejected";
  isActive: boolean;
};

type MealDetails = {
  id: number;
  title: string | null;
  mealType: string | null;
  menuDescription: string | null;
  mealPhotoUrl: string | null;
  menuItems?: MealMenuItem[];
  dateTime: string | null;
  seatsTotal: number;
  pricePerSeatCents: number;
  houseRules: string | null;
  selectedTagCodes?: string[];
  selectedFilterIds?: string[];
  status: MealStatus;
};

type MealMenuItemCategory =
  | "starter"
  | "main"
  | "dessert"
  | "savory"
  | "sweet"
  | "drinks"
  | "snacks"
  | "sharing"
  | "breads"
  | "fruits";

type MealMenuItem = {
  id?: number;
  category: MealMenuItemCategory;
  label: string;
  position: number;
};

type MealMenuDraftItem = {
  localId: string;
  category: MealMenuItemCategory;
  label: string;
};

type MealDraftForm = {
  seatsTotal: string;
  date: string;
  time: string;
  title: string;
  mealType: string;
  menuItems: MealMenuDraftItem[];
  pricePerSeat: string;
  houseRules: string;
};

type MealSavePayload = {
  title: string;
  mealType: string;
  menuDescription: string;
  menuItems: ReturnType<typeof getFilledMenuItems>;
  seatsTotal: number;
  pricePerSeatCents: number;
  houseRules: string;
  selectedTagCodes: string[];
  mealPhotoUrl?: string | null;
  dateTime?: string;
};

const STANDARD_COMMISSION_RATE = 0.15;
const FINAL_COMMISSION_FIXED_FEE = 1;
const MAX_MEAL_PHOTO_SIZE_MB = 3;
const MAX_MEAL_PHOTO_SIZE_BYTES = MAX_MEAL_PHOTO_SIZE_MB * 1024 * 1024;
const MEAL_PHOTO_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

const STEP_LABELS = [
  "Bienvenue",
  "Convives",
  "Date et heure",
  "Lieu",
  "Details",
] as const;

const MEAL_TYPE_PRESETS = [
  "Brunch",
  "Dejeuner",
  "Diner",
  "Apero",
  "Gouter",
  "Petit-dejeuner",
] as const;

type MealTypePreset = (typeof MEAL_TYPE_PRESETS)[number];

const MENU_CATEGORY_LABELS: Record<MealMenuItemCategory, string> = {
  starter: "Entrée",
  main: "Plat",
  dessert: "Dessert",
  savory: "Salé",
  sweet: "Sucré",
  drinks: "Boissons",
  snacks: "À grignoter",
  sharing: "À partager",
  breads: "Viennoiseries & pains",
  fruits: "Fruits & accompagnements",
};

const DEFAULT_MENU_CATEGORY: MealMenuItemCategory = "main";

const MENU_CATEGORIES_BY_MEAL_TYPE: Record<MealTypePreset, MealMenuItemCategory[]> = {
  Brunch: ["savory", "sweet", "drinks"],
  Dejeuner: ["starter", "main", "dessert"],
  Diner: ["starter", "main", "dessert"],
  Apero: ["snacks", "sharing", "drinks"],
  Gouter: ["sweet", "fruits", "drinks"],
  "Petit-dejeuner": ["drinks", "breads", "fruits"],
};

const ALL_MENU_CATEGORIES = Object.keys(
  MENU_CATEGORY_LABELS,
) as MealMenuItemCategory[];

const HOUSE_RULE_TAGS = [
  { code: "arriver_a_l_heure", label: "Merci d'arriver à l'heure" },
  { code: "prevenir_allergie", label: "Préviens-moi en cas d'allergie" },
  { code: "non_fumeur", label: "Non-fumeur" },
  { code: "pas_d_alcool", label: "Pas d'alcool" },
  { code: "pas_d_animaux", label: "Pas d'animaux" },
  { code: "retirer_ses_chaussures", label: "Retirer ses chaussures" },
  { code: "ambiance_calme", label: "Ambiance calme" },
  { code: "accessible_pmr", label: "Accessible PMR" },
] as const;

type HouseRuleTagCode = (typeof HOUSE_RULE_TAGS)[number]["code"];

const DIETARY_FILTER_GROUP = MOCK_MEAL_FILTER_GROUPS.find(
  (group) => group.id === "dietary-preferences",
);
const AMBIANCE_FILTER_GROUP = MOCK_MEAL_FILTER_GROUPS.find(
  (group) => group.id === "meal-ambiance",
);
const DIETARY_FILTER_IDS = DIETARY_FILTER_GROUP?.filters.map((filter) => filter.id) ?? [];
const AMBIANCE_FILTER_IDS = AMBIANCE_FILTER_GROUP?.filters.map((filter) => filter.id) ?? [];
const HOUSE_RULE_TAG_CODES = HOUSE_RULE_TAGS.map((tag) => tag.code);
const DIETARY_FILTER_HELP_TEXT =
  "Choisis les régimes et les contraintes de ton repas";
const AMBIANCE_FILTER_HELP_TEXT =
  "Choisis les tags qui décrivent l'ambiance que tu proposes autour de la table.";

function formatSelectedDate(value: string) {
  if (!value) {
    return "Choisir une date";
  }

  return format(parseISO(value), "EEEE d MMMM yyyy", { locale: fr });
}

function combineDateAndTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function parseSeatsTotal(value: string) {
  if (!value.trim()) {
    return 0;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return parsedValue;
}

function parsePricePerSeat(value: string) {
  const parsedValue = Number(value.replace(",", "."));

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return parsedValue;
}

function formatEuroInputValue(value: number) {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function splitHouseRules(value: string) {
  const selectedHouseRuleCodes = HOUSE_RULE_TAGS.filter((tag) =>
    value.includes(tag.label),
  ).map((tag) => tag.code);
  const customHouseRules = HOUSE_RULE_TAGS
    .reduce((remainingValue, tag) => remainingValue.replace(tag.label, ""), value)
    .replace(/\s+/g, " ")
    .trim();

  return {
    selectedHouseRuleCodes,
    customHouseRules,
  };
}

function getMenuCategoriesForMealType(mealType: string) {
  const matchedMealType = MEAL_TYPE_PRESETS.find((preset) => preset === mealType);

  return matchedMealType
    ? MENU_CATEGORIES_BY_MEAL_TYPE[matchedMealType]
    : MENU_CATEGORIES_BY_MEAL_TYPE.Diner;
}

function getDefaultMenuCategoryForMealType(mealType: string) {
  return getMenuCategoriesForMealType(mealType)[0] ?? DEFAULT_MENU_CATEGORY;
}

function normalizeMenuCategoryForMealType(
  category: MealMenuItemCategory,
  mealType: string,
) {
  const availableCategories = getMenuCategoriesForMealType(mealType);

  return availableCategories.includes(category)
    ? category
    : getDefaultMenuCategoryForMealType(mealType);
}

function isMealMenuItemCategory(value: string): value is MealMenuItemCategory {
  return ALL_MENU_CATEGORIES.includes(value as MealMenuItemCategory);
}

function createEmptyMenuItem(
  category: MealMenuItemCategory = DEFAULT_MENU_CATEGORY,
): MealMenuDraftItem {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  return {
    localId: randomId,
    category,
    label: "",
  };
}

function buildDraftMenuItems(
  menuItems: MealMenuItem[] | undefined,
  menuDescription: string | null,
  mealType: string,
) {
  if (Array.isArray(menuItems) && menuItems.length > 0) {
    return [...menuItems]
      .sort((firstItem, secondItem) => firstItem.position - secondItem.position)
      .map((item) => ({
        localId: item.id ? `remote-${item.id}` : createEmptyMenuItem().localId,
        category: normalizeMenuCategoryForMealType(item.category, mealType),
        label: item.label,
      }));
  }

  const legacyItems = menuDescription
    ?.split(/[\n.,;:]/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (legacyItems && legacyItems.length > 0) {
    return legacyItems.map((label, index) => ({
      localId: `legacy-${index}-${label}`,
      category: getDefaultMenuCategoryForMealType(mealType),
      label,
    }));
  }

  return [createEmptyMenuItem(getDefaultMenuCategoryForMealType(mealType))];
}

function getFilledMenuItems(menuItems: MealMenuDraftItem[]) {
  return menuItems
    .map((item, index) => ({
      category: item.category,
      label: item.label.trim(),
      position: index,
    }))
    .filter((item) => item.label.length > 0);
}

function moveMenuItem(
  items: MealMenuDraftItem[],
  itemId: string,
  direction: -1 | 1,
) {
  const currentIndex = items.findIndex((item) => item.localId === itemId);
  const nextIndex = currentIndex + direction;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(currentIndex, 1);
  nextItems.splice(nextIndex, 0, movedItem);
  return nextItems;
}

function toggleSelectedValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((selectedValue) => selectedValue !== value)
    : [...values, value];
}

function formatStepQueryValue(value: string | null) {
  if (!value) {
    return 0;
  }

  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue)) {
    return 0;
  }

  return Math.min(4, Math.max(0, parsedValue));
}

function getMealQueryParams() {
  if (typeof window === "undefined") {
    return {
      mealId: null as number | null,
      step: 0 as WizardStep,
    };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const mealIdValue = searchParams.get("mealId");
  const parsedMealId = mealIdValue ? Number(mealIdValue) : Number.NaN;

  return {
    mealId: Number.isInteger(parsedMealId) && parsedMealId > 0 ? parsedMealId : null,
    step: formatStepQueryValue(searchParams.get("step")) as WizardStep,
  };
}

export default function CreerRepasPage() {
  const router = useRouter();
  const { isLoggedIn, loading } = useAuth();
  const [step, setStep] = useState<WizardStep>(0);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState<WizardStep>(0);
  const [editingMealId, setEditingMealId] = useState<number | null>(null);
  const [editingMealStatus, setEditingMealStatus] = useState<MealStatus | null>(null);
  const [isEditingMeal, setIsEditingMeal] = useState(false);
  const [loadingMeal, setLoadingMeal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hostProfile, setHostProfile] = useState<HostProfileSummary | null>(null);
  const [hostProfileLoading, setHostProfileLoading] = useState(true);
  const [hostProfileError, setHostProfileError] = useState<string | null>(null);
  const [selectedHouseRuleCodes, setSelectedHouseRuleCodes] = useState<HouseRuleTagCode[]>([]);
  const [selectedDietaryFilterIds, setSelectedDietaryFilterIds] = useState<string[]>([]);
  const [selectedAmbianceFilterIds, setSelectedAmbianceFilterIds] = useState<string[]>([]);
  const [mealPhotoFile, setMealPhotoFile] = useState<File | null>(null);
  const [mealPhotoPreviewUrl, setMealPhotoPreviewUrl] = useState("");
  const [mealPhotoUrl, setMealPhotoUrl] = useState<string | null>(null);
  const [removeMealPhoto, setRemoveMealPhoto] = useState(false);
  const [form, setForm] = useState<MealDraftForm>({
    seatsTotal: "1",
    date: "",
    time: "19:30",
    title: "",
    mealType: "Diner",
    menuItems: [createEmptyMenuItem(getDefaultMenuCategoryForMealType("Diner"))],
    pricePerSeat: "18",
    houseRules: "",
  });

  useEffect(() => {
    return () => {
      if (mealPhotoPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(mealPhotoPreviewUrl);
      }
    };
  }, [mealPhotoPreviewUrl]);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/connexion");
    }
  }, [isLoggedIn, loading, router]);

  useEffect(() => {
    const { mealId, step: initialStep } = getMealQueryParams();
    setEditingMealId(mealId);
    setIsEditingMeal(Boolean(mealId));
    setStep(mealId ? initialStep : 0);
    setMaxUnlockedStep(mealId ? 4 : 0);
  }, []);

  useEffect(() => {
    if (loading || !isLoggedIn) {
      return;
    }

    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!token || !apiUrl) {
      setHostProfileLoading(false);
      setHostProfileError("Impossible de récupérer ton profil hôte.");
      return;
    }

    let cancelled = false;

    const loadHostProfile = async () => {
      try {
        setHostProfileLoading(true);
        setHostProfileError(null);

        const response = await axios.get<HostProfileSummary>(
          `${apiUrl}/host-profiles/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!cancelled) {
          setHostProfile(response.data);
        }
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        const message = axios.isAxiosError(error)
          ? error.response?.data?.message ?? "Profil hôte introuvable."
          : "Profil hôte introuvable.";

        setHostProfileError(Array.isArray(message) ? message.join(", ") : message);
        setHostProfile(null);
      } finally {
        if (!cancelled) {
          setHostProfileLoading(false);
        }
      }
    };

    void loadHostProfile();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, loading]);

  useEffect(() => {
    if (loading || !isLoggedIn || !editingMealId) {
      return;
    }

    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!token || !apiUrl) {
      return;
    }

    let cancelled = false;

    const loadMeal = async () => {
      try {
        setLoadingMeal(true);

        const response = await axios.get<MealDetails>(
          `${apiUrl}/meals/me/${editingMealId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (cancelled) {
          return;
        }

        const meal = response.data;
        const dateObject = meal.dateTime ? new Date(meal.dateTime) : null;
        const { selectedHouseRuleCodes: legacyHouseRuleCodes, customHouseRules } =
          splitHouseRules(meal.houseRules ?? "");
        const selectedTagCodes = meal.selectedTagCodes ?? meal.selectedFilterIds ?? [];
        const loadedHouseRuleCodes = selectedTagCodes.filter(
          (tagCode): tagCode is HouseRuleTagCode =>
            HOUSE_RULE_TAG_CODES.includes(tagCode as HouseRuleTagCode),
        );

        setSelectedHouseRuleCodes(
          Array.from(new Set([...loadedHouseRuleCodes, ...legacyHouseRuleCodes])),
        );
        setSelectedDietaryFilterIds(
          selectedTagCodes.filter((filterId) =>
            DIETARY_FILTER_IDS.includes(filterId),
          ),
        );
        setSelectedAmbianceFilterIds(
          selectedTagCodes.filter((filterId) =>
            AMBIANCE_FILTER_IDS.includes(filterId),
          ),
        );
        setForm({
          seatsTotal: String(meal.seatsTotal),
          date: meal.dateTime?.split("T")[0] ?? "",
          time: dateObject ? format(dateObject, "HH:mm") : "19:30",
          title: meal.title ?? "",
          mealType: meal.mealType ?? "Diner",
          menuItems: buildDraftMenuItems(
            meal.menuItems,
            meal.menuDescription,
            meal.mealType ?? "Diner",
          ),
          pricePerSeat: String(meal.pricePerSeatCents / 100),
          houseRules: customHouseRules,
        });
        setMealPhotoFile(null);
        setMealPhotoPreviewUrl("");
        setMealPhotoUrl(meal.mealPhotoUrl);
        setRemoveMealPhoto(false);
        setEditingMealStatus(meal.status);
      } catch (error: unknown) {
        const message = axios.isAxiosError(error)
          ? error.response?.data?.message ?? "Impossible de charger cet événement."
          : "Impossible de charger cet événement.";
        toast.error(Array.isArray(message) ? message.join(", ") : message);
        router.replace("/mes-evenements");
      } finally {
        if (!cancelled) {
          setLoadingMeal(false);
        }
      }
    };

    void loadMeal();

    return () => {
      cancelled = true;
    };
  }, [editingMealId, isLoggedIn, loading, router]);

  const progressPercent = ((step + 1) / STEP_LABELS.length) * 100;
  const composedDateTime = useMemo(() => {
    if (!form.date || !form.time) {
      return null;
    }

    return combineDateAndTime(form.date, form.time);
  }, [form.date, form.time]);
  const seatsTotalValue = useMemo(
    () => parseSeatsTotal(form.seatsTotal),
    [form.seatsTotal],
  );
  const pricePerSeatValue = useMemo(
    () => parsePricePerSeat(form.pricePerSeat),
    [form.pricePerSeat],
  );
  const hostRevenuePerSeat = useMemo(
    () => pricePerSeatValue * (1 - STANDARD_COMMISSION_RATE),
    [pricePerSeatValue],
  );
  const hostRevenuePerSeatLabel = formatEuroInputValue(hostRevenuePerSeat);
  const hostTotalRevenueIfFull = useMemo(() => {
    const totalAfterReservationCommission = hostRevenuePerSeat * seatsTotalValue;
    const totalAfterFinalCommission =
      totalAfterReservationCommission * (1 - STANDARD_COMMISSION_RATE) -
      FINAL_COMMISSION_FIXED_FEE;

    return Math.max(0, totalAfterFinalCommission);
  }, [hostRevenuePerSeat, seatsTotalValue]);
  const hostTotalRevenueIfFullLabel = formatEuroInputValue(hostTotalRevenueIfFull);
  const menuCategoryOptions = useMemo(
    () =>
      getMenuCategoriesForMealType(form.mealType).map((category) => ({
        value: category,
        label: MENU_CATEGORY_LABELS[category],
      })),
    [form.mealType],
  );

  const locationReady = Boolean(
    hostProfile?.address &&
      hostProfile.city &&
      hostProfile.country &&
      hostProfile.validationStatus === "approved" &&
      hostProfile.isActive,
  );

  const stepCanContinue = useMemo(() => {
    if (step === 0) return true;
    if (step === 1) return seatsTotalValue > 0;
    if (step === 2) {
      return Boolean(form.date && form.time);
    }
    if (step === 3) return locationReady;

    return (
      seatsTotalValue > 0 &&
      form.title.trim().length > 0 &&
      form.mealType.trim().length > 0 &&
      getFilledMenuItems(form.menuItems).length > 0 &&
      (selectedHouseRuleCodes.length > 0 || form.houseRules.trim().length > 0) &&
      pricePerSeatValue >= 0 &&
      Boolean(composedDateTime)
    );
  }, [
    composedDateTime,
    form,
    locationReady,
    pricePerSeatValue,
    seatsTotalValue,
    selectedHouseRuleCodes,
    step,
  ]);

  const selectedDateLabel = formatSelectedDate(form.date);
  const visibleMealPhotoSrc =
    mealPhotoPreviewUrl || (!removeMealPhoto ? mealPhotoUrl : null);

  const goToStep = (nextStep: WizardStep, options?: { force?: boolean }) => {
    if (!options?.force && !isEditingMeal && nextStep > maxUnlockedStep) {
      return;
    }

    setStep(nextStep);

    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (editingMealId) {
        searchParams.set("mealId", String(editingMealId));
      }
      searchParams.set("step", String(nextStep));
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}?${searchParams.toString()}`,
      );
    }
  };

  const handlePrevious = () => {
    goToStep(Math.max(0, step - 1) as WizardStep);
  };

  const handleNext = () => {
    if (!stepCanContinue || step === 4) {
      return;
    }

    const nextStep = Math.min(4, step + 1) as WizardStep;

    if (!isEditingMeal) {
      setMaxUnlockedStep((previousStep) =>
        (nextStep > previousStep ? nextStep : previousStep) as WizardStep,
      );
    }

    goToStep(nextStep, { force: true });
  };

  const buildMealSavePayload = (): MealSavePayload => {
    const filledMenuItems = getFilledMenuItems(form.menuItems);
    const payload: MealSavePayload = {
      title: form.title.trim(),
      mealType: form.mealType.trim(),
      menuDescription: filledMenuItems.map((item) => item.label).join("\n"),
      menuItems: filledMenuItems,
      seatsTotal: seatsTotalValue,
      pricePerSeatCents: Math.round(pricePerSeatValue * 100),
      houseRules: form.houseRules.trim(),
      selectedTagCodes: [
        ...selectedHouseRuleCodes,
        ...selectedDietaryFilterIds,
        ...selectedAmbianceFilterIds,
      ],
    };

    if (composedDateTime) {
      payload.dateTime = composedDateTime.toISOString();
    }

    if (removeMealPhoto) {
      payload.mealPhotoUrl = null;
    } else if (mealPhotoUrl) {
      payload.mealPhotoUrl = mealPhotoUrl;
    }

    return payload;
  };

  const updateDraftUrl = (mealId: number) => {
    if (typeof window === "undefined") {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("mealId", String(mealId));
    searchParams.set("step", String(step));
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${searchParams.toString()}`,
    );
  };

  const getAuthContext = () => {
    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!token || !apiUrl) {
      toast.error("Session invalide. Reconnecte-toi.");
      router.push("/connexion");
      return null;
    }

    return { token, apiUrl };
  };

  const handleMealPhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!MEAL_PHOTO_MIME_TYPES.includes(file.type)) {
      toast.error("La photo doit être au format PNG, JPG, JPEG ou WebP.");
      return;
    }

    if (file.size > MAX_MEAL_PHOTO_SIZE_BYTES) {
      toast.error(`La photo ne doit pas dépasser ${MAX_MEAL_PHOTO_SIZE_MB} Mo.`);
      return;
    }

    setMealPhotoFile(file);
    setMealPhotoPreviewUrl(URL.createObjectURL(file));
    setRemoveMealPhoto(false);
  };

  const handleRemoveMealPhoto = () => {
    setMealPhotoFile(null);
    setMealPhotoPreviewUrl("");
    setMealPhotoUrl(null);
    setRemoveMealPhoto(true);
  };

  const uploadMealPhoto = async (
    mealId: number,
    token: string,
    apiUrl: string,
  ) => {
    if (!mealPhotoFile) {
      return null;
    }

    const formData = new FormData();
    formData.append("meal_photo", mealPhotoFile);

    const response = await axios.patch<MealDetails>(
      `${apiUrl}/meals/me/${mealId}/photo`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return response.data;
  };

  const persistMealDraft = async (token: string, apiUrl: string) => {
    const payload = buildMealSavePayload();
    let savedMeal: MealDetails;

    if (editingMealId) {
      const response = await axios.patch<MealDetails>(
        `${apiUrl}/meals/me/${editingMealId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      savedMeal = response.data;
    } else {
      const response = await axios.post<MealDetails>(`${apiUrl}/meals`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      savedMeal = response.data;
      setEditingMealId(response.data.id);
      setIsEditingMeal(true);
      updateDraftUrl(response.data.id);
    }

    const uploadedMeal = await uploadMealPhoto(savedMeal.id, token, apiUrl);
    if (uploadedMeal) {
      savedMeal = uploadedMeal;
    }

    setEditingMealStatus(savedMeal.status);
    setMealPhotoUrl(savedMeal.mealPhotoUrl);
    setMealPhotoFile(null);
    setMealPhotoPreviewUrl("");
    setRemoveMealPhoto(false);

    return savedMeal;
  };

  const handleSaveDraft = async () => {
    const authContext = getAuthContext();

    if (!authContext) {
      return;
    }

    try {
      setSubmitting(true);
      await persistMealDraft(authContext.token, authContext.apiUrl);
      toast.success("Le brouillon a été enregistré.");
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? "L'enregistrement du brouillon a échoué."
        : "L'enregistrement du brouillon a échoué.";
      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSubmitting(false);
    }
  };

  const shouldPublishOnSubmit = !editingMealId || editingMealStatus === "draft";
  const showDraftButton = editingMealStatus === null || editingMealStatus === "draft";

  const handleSubmit = async () => {
    if (!stepCanContinue || !composedDateTime) {
      return;
    }

    const authContext = getAuthContext();

    if (!authContext) {
      return;
    }

    if (
      (shouldPublishOnSubmit || editingMealStatus === "published") &&
      !mealPhotoFile &&
      !visibleMealPhotoSrc
    ) {
      toast.error("Ajoute une photo principale du repas avant de publier.");
      return;
    }

    try {
      setSubmitting(true);

      const savedMeal = await persistMealDraft(authContext.token, authContext.apiUrl);

      if (shouldPublishOnSubmit) {
        await axios.patch(`${authContext.apiUrl}/meals/me/${savedMeal.id}/publish`, null, {
          headers: {
            Authorization: `Bearer ${authContext.token}`,
          },
        });
        toast.success("Ton événement a été publié.");
      } else {
        toast.success("L'événement a été mis à jour.");
      }

      router.push("/mes-evenements");
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? "L'enregistrement de l'événement a échoué."
        : "L'enregistrement de l'événement a échoué.";
      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || loadingMeal) {
    return (
      <section className={styles.page}>
        <div className={styles.loadingState}>
          {loadingMeal ? "Chargement de l'événement..." : "Préparation du créateur de événement..."}
        </div>
      </section>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <section className={styles.page}>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <p className={styles.sidebarKicker}>
              {isEditingMeal ? "Modification de l'événement" : "Création de l'événement"}
            </p>
            <h1>
              {isEditingMeal
                ? "Reprends ton événement et ajuste seulement ce qui compte"
                : "Organiser un événement devient plus simple, étape par étape"}
            </h1>
            <p className={styles.sidebarDescription}>
              Compose d&apos;abord l&apos;essentiel, puis ajoute les informations qui
              rassurent tes futurs invités. L&apos;événement restera brouillon tant que tu
              ne le publies pas.
            </p>

            <div className={styles.progressTrack} aria-hidden="true">
              <span
                className={styles.progressFill}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className={styles.progressList}>
              {STEP_LABELS.map((label, index) => {
                const isCurrent = index === step;
                const isDone = index < step;
                const isLocked = !isEditingMeal && index > maxUnlockedStep;

                return (
                  <button
                    key={label}
                    type="button"
                    className={`${styles.progressItem} ${
                      isCurrent ? styles["progressItem--current"] : ""
                    } ${isDone ? styles["progressItem--done"] : ""}`}
                    onClick={() => goToStep(index as WizardStep)}
                    disabled={isLocked}
                  >
                    <span
                      className={`${styles.progressIndex} ${
                        isDone ? styles["progressIndex--done"] : ""
                      }`}
                    >
                      <Image
                        src={isDone ? "/poire1.svg" : "/poire2.svg"}
                        alt=""
                        width={18}
                        height={22}
                        aria-hidden="true"
                      />
                    </span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

          </div>
        </aside>

        <div className={styles.stageCard}>
          <div className={styles.mobileProgress}>
            <div className={styles.mobileProgressBar}>
              <span style={{ width: `${progressPercent}%` }} />
            </div>
            <p>
              Etape {step + 1} sur {STEP_LABELS.length}
            </p>
            <div className={styles.mobileSteps}>
              {STEP_LABELS.map((label, index) => {
                const isDone = index < step;

                return (
                  <button
                    key={label}
                    type="button"
                    className={`${styles.mobileStepButton} ${
                      step === index ? styles["mobileStepButton--active"] : ""
                    } ${isDone ? styles["mobileStepButton--done"] : ""}`}
                    onClick={() => goToStep(index as WizardStep)}
                    disabled={!isEditingMeal && index > maxUnlockedStep}
                  >
                    <Image
                      src={isDone ? "/poire1.svg" : "/poire2.svg"}
                      alt=""
                      width={18}
                      height={22}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={`${styles.stageBody} ${
              step === 0 ? styles.stageBodyIntro : ""
            }`}
          >
            {step === 0 ? (
              <div className={`${styles.centerStage} ${styles.introStage}`}>
                <h2 className={styles.introTitle}>
                  {isEditingMeal ? "Modifier ton événement" : "Organiser un événement"}
                </h2>
                <p className={styles.introDescription}>
                  {isEditingMeal
                    ? "Toutes les informations déjà saisies sont reprises pour que tu puisses ajuster ton événement sans recommencer."
                    : "Vous souhaitez cuisiner et accueillir des gens ? On construit d'abord l'essentiel, puis on affine les détails pour rassurer vos invités."}
                </p>
              </div>
            ) : null}

            {step === 1 ? (
              <div className={styles.centerStage}>
                <h2>Pour combien de personnes souhaitez-vous cuisiner ?</h2>

                <div className={styles.seatCounter}>
                  <button
                    type="button"
                    className={styles.counterButton}
                    onClick={() =>
                      setForm((previousForm) => {
                        const nextValue = Math.max(
                          1,
                          parseSeatsTotal(previousForm.seatsTotal) - 1,
                        );

                        return {
                          ...previousForm,
                          seatsTotal: String(nextValue),
                        };
                      })
                    }
                    aria-label="Retirer une place"
                  >
                    -
                  </button>

                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={styles.counterInput}
                    value={form.seatsTotal}
                    onChange={(event) =>
                      setForm((previousForm) => {
                        const nextValue = event.target.value.replace(/\D+/g, "");

                        return {
                          ...previousForm,
                          seatsTotal: nextValue,
                        };
                      })
                    }
                    aria-label="Nombre de convives"
                  />

                  <button
                    type="button"
                    className={styles.counterButton}
                    onClick={() =>
                      setForm((previousForm) => ({
                        ...previousForm,
                        seatsTotal: String(parseSeatsTotal(previousForm.seatsTotal) + 1),
                      }))
                    }
                    aria-label="Ajouter une place"
                  >
                    +
                  </button>
                </div>

                <p className={styles.helperText}>
                  Utilise les boutons ou saisis directement le nombre de convives.
                </p>
              </div>
            ) : null}

            {step === 2 ? (
              <div className={styles.centerStage}>
                <h2>Quand souhaitez-vous organiser l&apos;événement ?</h2>

                <div className={styles.dateTimeGrid}>
                  <div className={styles.datePickerWrap}>
                    <DatePickerField
                      value={form.date}
                      onChange={(value) =>
                        setForm((previousForm) => ({
                          ...previousForm,
                          date: value,
                        }))
                      }
                      placeholder="Choisir une date"
                      variant="input"
                      ariaLabel="Choisir une date pour l'événement"
                    />
                  </div>

                  <label className={styles.timeField}>
                    <span>Heure d&apos;arrivee</span>
                    <TimePickerField
                      value={form.time}
                      onChange={(value) =>
                        setForm((previousForm) => ({
                          ...previousForm,
                          time: value,
                        }))
                      }
                      placeholder="Choisir une horaire"
                      ariaLabel="Choisir une heure d'arrivee"
                    />
                  </label>
                </div>

                <div className={styles.selectionPreview}>
                  <CalendarDays />
                  <span>
                    {selectedDateLabel}
                    {form.time ? ` - ${form.time}` : ""}
                  </span>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className={styles.centerStage}>
                <h2>Où les invités doivent-ils se rendre ?</h2>

                {hostProfileLoading ? (
                  <p>Chargement de l&apos;adresse du profil hôte...</p>
                ) : hostProfileError ? (
                  <div className={styles.locationErrorCard}>
                    <p>{hostProfileError}</p>
                    <button
                      type="button"
                      className={styles.inlineActionButton}
                      onClick={() => router.push("/profil")}
                    >
                      Compléter mon profil
                    </button>
                  </div>
                ) : (
                  <div className={styles.locationCard}>
                    <label className={styles.field}>
                      <span>Numero et nom de voie</span>
                      <input type="text" value={hostProfile?.address || ""} readOnly />
                    </label>

                    <div className={styles.locationGrid}>
                      <label className={styles.field}>
                        <span>Quartier</span>
                        <input
                          type="text"
                          value={hostProfile?.districtLabel || ""}
                          readOnly
                        />
                      </label>

                      <label className={styles.field}>
                        <span>Ville</span>
                        <input type="text" value={hostProfile?.city || ""} readOnly />
                      </label>
                    </div>

                    <label className={styles.field}>
                      <span>Pays</span>
                      <input type="text" value={hostProfile?.country || ""} readOnly />
                    </label>

                    <button
                      type="button"
                      className={styles.inlineActionButton}
                      onClick={() => router.push("/profil")}
                    >
                      Mettre à jour mon profil hôte
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {step === 4 ? (
              <div className={styles.detailsStage}>
                <div className={styles.sectionTitle}>
                  <h2>Quelques informations supplémentaires</h2>
                  <p>
                    Afin d&apos;organiser correctement votre événement, nous avons besoin
                    de quelques détails.
                  </p>
                </div>

                <div className={styles.formSection}>
                  <div className={styles.formSectionHead}>
                    <NotebookText />
                    <div>
                      <h3>Informations générales</h3>
                      <p>Donne envie en quelques lignes claires et accueillantes.</p>
                    </div>
                  </div>

                  <div className={styles.formGrid}>
                    <label className={`${styles.field} ${styles.titleField}`}>
                      <span>Titre de l&apos;événement</span>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(event) =>
                          setForm((previousForm) => ({
                            ...previousForm,
                            title: event.target.value,
                          }))
                        }
                        placeholder="Ex. Diner italien entre voisins"
                      />
                    </label>

                    <div className={styles.mealPhotoField}>
                      <div className={styles.mealPhotoHeading}>
                        <span>Photo principale du repas</span>
                        <small className={styles.fieldSubtitle}>
                          Obligatoire pour publier. PNG, JPG, JPEG ou WebP, 3 Mo max.
                        </small>
                      </div>

                      <div className={styles.mealPhotoUploadBox}>
                        {visibleMealPhotoSrc ? (
                          <div className={styles.mealPhotoPreview}>
                            <Image
                              src={visibleMealPhotoSrc}
                              alt="Aperçu de la photo du repas"
                              fill
                              unoptimized
                              sizes="(max-width: 560px) 100vw, 260px"
                              className={styles.mealPhotoPreviewImage}
                            />
                          </div>
                        ) : (
                          <div className={styles.mealPhotoPlaceholder}>
                            <CookingPot aria-hidden="true" />
                            <span>Ajoute une image qui donne envie de réserver.</span>
                          </div>
                        )}

                        <div className={styles.mealPhotoActions}>
                          <label
                            htmlFor="meal-photo-upload"
                            className={styles.mealPhotoUploadButton}
                          >
                            {visibleMealPhotoSrc ? "Changer la photo" : "Ajouter une photo"}
                          </label>
                          <input
                            id="meal-photo-upload"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleMealPhotoChange}
                            className={styles.mealPhotoInput}
                          />
                          {visibleMealPhotoSrc ? (
                            <button
                              type="button"
                              className={styles.photoRemoveButton}
                              onClick={handleRemoveMealPhoto}
                            >
                              Supprimer
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <label className={`${styles.field} ${styles.priceInputField}`}>
                      <span>Prix par place</span>
                      <small className={styles.fieldSubtitle}>Sans commission</small>
                      <div className={styles.priceField}>
                        <input
                          type="number"
                          min="0"
                          step="0.50"
                          value={form.pricePerSeat}
                          onChange={(event) =>
                            setForm((previousForm) => ({
                              ...previousForm,
                              pricePerSeat: event.target.value,
                            }))
                          }
                          placeholder="18"
                        />
                        <span>EUR</span>
                      </div>
                    </label>

                    <div className={styles.commissionPreview}>
                      <span>Prix sans commission (par personne)</span>
                      <div className={styles.commissionField}>
                        <small>Commission 15%</small>
                        <div className={`${styles.priceField} ${styles.readonlyPriceField}`}>
                          <input
                            type="text"
                            value={hostRevenuePerSeatLabel}
                            readOnly
                            aria-label="Montant touché par l'hôte avec commission de 15%"
                          />
                          <span>EUR</span>
                        </div>
                      </div>
                    </div>

                    <p className={styles.totalCommissionSummary}>
                        Une commission de 15% est appliquée sur chaque
                        réservation. Une fois la date limite de réservation
                        dépassée, une commission finale de 15% + 1€ est
                        appliquée sur le total restant.
                    </p>

                  </div>

                  <div className={styles.formSectionHead}>
                    <CookingPot />
                    <div>
                      <h3>Au menu</h3>
                      <p>Choisis le type de moment, puis ajoute les éléments du menu par catégorie.</p>
                    </div>
                  </div>

                  <div className={styles.chipRow}>
                    {MEAL_TYPE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`${styles.filterChip} ${
                          form.mealType === preset ? styles["filterChip--selected"] : ""
                        }`}
                        onClick={() =>
                          setForm((previousForm) => ({
                            ...previousForm,
                            mealType: preset,
                            menuItems: previousForm.menuItems.map((item) => ({
                              ...item,
                              category: normalizeMenuCategoryForMealType(
                                item.category,
                                preset,
                              ),
                            })),
                          }))
                        }
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div className={styles.menuBuilder}>
                    <div className={styles.menuBuilderHead}>
                      <span>Éléments du menu</span>
                      <button
                        type="button"
                        className={styles.inlineActionButton}
                        onClick={() =>
                          setForm((previousForm) => ({
                            ...previousForm,
                            menuItems: [
                              ...previousForm.menuItems,
                              createEmptyMenuItem(
                                previousForm.menuItems[previousForm.menuItems.length - 1]
                                  ?.category ?? getDefaultMenuCategoryForMealType(
                                    previousForm.mealType,
                                  ),
                              ),
                            ],
                          }))
                        }
                      >
                        <Plus aria-hidden="true" />
                        Ajouter
                      </button>
                    </div>

                    <div className={styles.menuItemList}>
                      {form.menuItems.map((menuItem, index) => (
                        <div key={menuItem.localId} className={styles.menuItemRow}>
                          <label className={styles.menuCategoryField}>
                            <span>Catégorie</span>
                            <select
                              value={menuItem.category}
                              onChange={(event) =>
                                setForm((previousForm) => ({
                                  ...previousForm,
                                  menuItems: previousForm.menuItems.map((item) =>
                                    item.localId === menuItem.localId
                                      ? {
                                          ...item,
                                          category: isMealMenuItemCategory(event.target.value)
                                            ? event.target.value
                                            : getDefaultMenuCategoryForMealType(
                                                previousForm.mealType,
                                              ),
                                        }
                                      : item,
                                  ),
                                }))
                              }
                            >
                              {menuCategoryOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className={styles.menuLabelField}>
                            <span>Plat ou élément</span>
                            <input
                              type="text"
                              value={menuItem.label}
                              onChange={(event) =>
                                setForm((previousForm) => ({
                                  ...previousForm,
                                  menuItems: previousForm.menuItems.map((item) =>
                                    item.localId === menuItem.localId
                                      ? { ...item, label: event.target.value }
                                      : item,
                                  ),
                                }))
                              }
                              placeholder={
                                index === 0
                                  ? "Ex. Brochettes"
                                  : "Ex. Légumes grillés"
                              }
                            />
                          </label>

                          <div className={styles.menuItemActions}>
                            <button
                              type="button"
                              className={styles.iconActionButton}
                              onClick={() =>
                                setForm((previousForm) => ({
                                  ...previousForm,
                                  menuItems: moveMenuItem(
                                    previousForm.menuItems,
                                    menuItem.localId,
                                    -1,
                                  ),
                                }))
                              }
                              disabled={index === 0}
                              aria-label="Monter cet élément du menu"
                              title="Monter"
                            >
                              <ArrowUp aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={styles.iconActionButton}
                              onClick={() =>
                                setForm((previousForm) => ({
                                  ...previousForm,
                                  menuItems: moveMenuItem(
                                    previousForm.menuItems,
                                    menuItem.localId,
                                    1,
                                  ),
                                }))
                              }
                              disabled={index === form.menuItems.length - 1}
                              aria-label="Descendre cet élément du menu"
                              title="Descendre"
                            >
                              <ArrowDown aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={styles.iconActionButton}
                              onClick={() =>
                                setForm((previousForm) => {
                                  if (previousForm.menuItems.length === 1) {
                                    return {
                                      ...previousForm,
                                      menuItems: [createEmptyMenuItem(menuItem.category)],
                                    };
                                  }

                                  return {
                                    ...previousForm,
                                    menuItems: previousForm.menuItems.filter(
                                      (item) => item.localId !== menuItem.localId,
                                    ),
                                  };
                                })
                              }
                              aria-label="Supprimer cet élément du menu"
                              title="Supprimer"
                            >
                              <Trash2 aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                <div className={styles.formSection}>
                  <div className={styles.formSectionHead}>
                    <Users />
                    <div>
                      <h3>Pour bien accueillir tes hôtes</h3>
                      <p>
                        Quelques règles simples évitent les malentendus et rassurent
                        les invités dès la publication.
                      </p>
                    </div>
                  </div>

                  <div className={styles.chipRow}>
                    {HOUSE_RULE_TAGS.map((tag) => (
                      <button
                        key={tag.code}
                        type="button"
                        className={`${styles.filterChip} ${
                          selectedHouseRuleCodes.includes(tag.code)
                            ? styles["filterChip--selected"]
                            : ""
                        }`}
                        aria-pressed={selectedHouseRuleCodes.includes(tag.code)}
                        onClick={() =>
                          setSelectedHouseRuleCodes((previousHouseRuleCodes) =>
                            toggleSelectedValue(
                              previousHouseRuleCodes,
                              tag.code,
                            ) as HouseRuleTagCode[],
                          )
                        }
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>

                  <label className={styles.field}>
                    <span>Regles de la maison</span>
                    <textarea
                      rows={4}
                      value={form.houseRules}
                      onChange={(event) =>
                        setForm((previousForm) => ({
                          ...previousForm,
                          houseRules: event.target.value,
                        }))
                      }
                      placeholder="Décris plus précisement les règles ici, si tu le souhaites."
                    />
                  </label>
                </div>

                <div className={styles.formSection}>
                  <div className={styles.formSectionHead}>
                    <NotebookText />
                    <div>
                      <h3>{DIETARY_FILTER_GROUP?.title}</h3>
                      <p>{DIETARY_FILTER_HELP_TEXT}</p>
                    </div>
                  </div>

                  <div className={styles.chipRow}>
                    {DIETARY_FILTER_GROUP?.filters.map((filter) => (
                      <button
                        key={filter.id}
                        type="button"
                        className={`${styles.filterChip} ${
                          selectedDietaryFilterIds.includes(filter.id)
                            ? styles["filterChip--selected"]
                            : ""
                        }`}
                        aria-pressed={selectedDietaryFilterIds.includes(filter.id)}
                        onClick={() =>
                          setSelectedDietaryFilterIds((previousFilterIds) =>
                            toggleSelectedValue(previousFilterIds, filter.id),
                          )
                        }
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.formSection}>
                  <div className={styles.formSectionHead}>
                    <Users />
                    <div>
                      <h3>{AMBIANCE_FILTER_GROUP?.title}</h3>
                      <p>{AMBIANCE_FILTER_HELP_TEXT}</p>
                    </div>
                  </div>

                  <div className={styles.chipRow}>
                    {AMBIANCE_FILTER_GROUP?.filters.map((filter) => (
                      <button
                        key={filter.id}
                        type="button"
                        className={`${styles.filterChip} ${
                          selectedAmbianceFilterIds.includes(filter.id)
                            ? styles["filterChip--selected"]
                            : ""
                        }`}
                        aria-pressed={selectedAmbianceFilterIds.includes(filter.id)}
                        onClick={() =>
                          setSelectedAmbianceFilterIds((previousFilterIds) =>
                            toggleSelectedValue(previousFilterIds, filter.id),
                          )
                        }
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`${styles.formSection} ${styles.totalCommissionSection}`}>
                  <label className={`${styles.field} ${styles.totalCommissionField}`}>
                    <span>Total reçu si toutes les places sont réservées</span>
                    <div className={`${styles.priceField} ${styles.readonlyPriceField}`}>
                      <input
                        type="text"
                        value={hostTotalRevenueIfFullLabel}
                        readOnly
                        aria-label="Total reçu par l'hôte si toutes les places sont réservées"
                      />
                      <span>EUR</span>
                    </div>
                  </label>
                </div>
              </div>
            ) : null}
          </div>

          <div className={styles.footerBar}>
            <button
              type="button"
              className={styles.footerGhostButton}
              onClick={step === 0 ? () => router.push("/mes-evenements") : handlePrevious}
            >
              <ChevronLeft />
              {step === 0 ? "Retour en arrière" : "Étape précédente"}
            </button>

            <div className={styles.footerActions}>
              {showDraftButton ? (
                <button
                  type="button"
                  className={styles.footerDraftButton}
                  onClick={() => void handleSaveDraft()}
                  disabled={submitting}
                >
                  <NotebookText />
                  {submitting ? "Enregistrement..." : "Enregistrer le brouillon"}
                </button>
              ) : null}

              {step < 4 ? (
                <button
                  type="button"
                  className={styles.footerPrimaryButton}
                  onClick={handleNext}
                  disabled={!stepCanContinue || submitting}
                >
                  {step === 0 ? "C'est parti !" : "Suivant"}
                  <ChevronRight />
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.footerPrimaryButton}
                  onClick={() => void handleSubmit()}
                  disabled={!stepCanContinue || submitting}
                >
                  {submitting
                    ? shouldPublishOnSubmit
                      ? "Publication..."
                      : "Enregistrement..."
                    : shouldPublishOnSubmit
                      ? "Publier"
                      : "Enregistrer"}
                  <Check />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

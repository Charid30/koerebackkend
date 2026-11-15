import { BadRequestException, ValidationError } from '@nestjs/common';

/** Nom lisible des champs les plus courants (sinon on affiche le nom technique). */
const CHAMPS: Record<string, string> = {
  email: 'L’email',
  motDePasse: 'Le mot de passe',
  nouveauMotDePasse: 'Le nouveau mot de passe',
  ancienMotDePasse: 'L’ancien mot de passe',
  nom: 'Le nom',
  prenom: 'Le prénom',
  role: 'Le rôle',
  telephone: 'Le téléphone',
  departement: 'Le département',
  numeroInterne: 'Le numéro interne',
  immatriculation: 'L’immatriculation',
  marque: 'La marque',
  modele: 'Le modèle',
  typeVehicule: 'Le type de véhicule',
  annee: 'L’année',
  kilometrage: 'Le kilométrage',
  heuresMoteur: 'Les heures moteur',
  carburant: 'Le carburant',
  statut: 'Le statut',
  vehiculeId: 'Le véhicule',
  description: 'La description',
  priorite: 'La priorité',
  typeMaintenance: 'Le type de maintenance',
  typeInspection: 'Le type d’inspection',
  datePlanifiee: 'La date planifiée',
  dateInspection: 'La date d’inspection',
  coutPrestataire: 'Le coût prestataire',
  coutPiecesTotal: 'Le coût des pièces',
  heuresInternesTotal: 'Les heures internes',
  tempsPasse: 'Le temps passé',
  quantite: 'La quantité',
  quantiteStock: 'La quantité en stock',
  quantiteDisponible: 'La quantité disponible',
  quantiteMinimum: 'Le seuil minimum',
  unite: 'L’unité',
  emplacement: 'L’emplacement',
  stockMinimum: 'Le stock minimum',
  prixUnitaire: 'Le prix unitaire',
  reference: 'La référence',
  designation: 'La désignation',
  items: 'Les points de contrôle',
  resultat: 'Le résultat',
  categorie: 'La catégorie',
  libelle: 'Le libellé',
  typeOperation: 'Le type d’opération',
  frequenceKm: 'La fréquence en km',
  frequenceHeures: 'La fréquence en heures',
  frequenceJours: 'La fréquence en jours',
  gravite: 'La gravité',
  occurrence: 'L’occurrence',
  detection: 'La détection',
};

function nombre(message: string): string {
  return message.match(/-?\d+(\.\d+)?/)?.[0] ?? '';
}

function caracteres(n: string): string {
  return `${n} caractère${Number(n) > 1 ? 's' : ''}`;
}

function traduire(champ: string, contrainte: string, message: string): string {
  const c = CHAMPS[champ] ?? `Le champ « ${champ} »`;
  switch (contrainte) {
    case 'isNotEmpty': return `${c} est obligatoire`;
    case 'isDefined': return `${c} est obligatoire`;
    case 'isString': return `${c} doit être un texte`;
    case 'isInt': return `${c} doit être un nombre entier`;
    case 'isNumber': return `${c} doit être un nombre`;
    case 'isBoolean': return `${c} doit être vrai ou faux`;
    case 'isEmail': return `${c} n’est pas une adresse email valide`;
    case 'isDateString':
    case 'isISO8601': return `${c} doit être une date valide`;
    case 'isEnum': return `${c} n’a pas une valeur autorisée`;
    case 'isArray': return `${c} doit être une liste`;
    case 'arrayNotEmpty': return `${c} ne peut pas être vide`;
    case 'min': return `${c} doit être supérieur ou égal à ${nombre(message)}`;
    case 'max': return `${c} doit être inférieur ou égal à ${nombre(message)}`;
    case 'minLength': return `${c} doit contenir au moins ${caracteres(nombre(message))}`;
    case 'maxLength': return `${c} doit contenir au plus ${caracteres(nombre(message))}`;
    case 'matches': return `${c} n’a pas le bon format`;
    case 'whitelistValidation': return `Le champ « ${champ} » n’est pas accepté`;
    default: return message;
  }
}

function aplatir(erreurs: ValidationError[], parent = ''): string[] {
  return erreurs.flatMap((e) => {
    const messages = Object.entries(e.constraints ?? {}).map(([k, m]) => traduire(e.property, k, m));
    const enfants = e.children?.length ? aplatir(e.children, `${parent}${e.property}.`) : [];
    return [...messages, ...enfants];
  });
}

/** Remplace les messages anglais de class-validator par des messages en français. */
export function erreursValidationFr(erreurs: ValidationError[]) {
  return new BadRequestException(aplatir(erreurs));
}

const ROLE_PREFIXES = {
  firmAdmin: 'FIRM_ADMIN',
  soloLawyer: 'SOLO_LAWYER',
  teamMember: 'TEAM_MEMBER',
};

function readAccount(prefix, suffix) {
  const email = process.env[`${prefix}_EMAIL${suffix}`];
  const password = process.env[`${prefix}_PASSWORD${suffix}`];

  if (!email && !password) {
    return null;
  }

  if (!email || !password) {
    throw new Error(
      `Incomplete ${prefix} credentials for variables ending in "${suffix}" in the selected environment.`,
    );
  }

  return {
    email,
    password,
  };
}

function getAccounts(prefix) {
  return ['', '1', '2']
    .map((suffix) => readAccount(prefix, suffix))
    .filter(Boolean);
}

const accounts = {};

for (const [role, prefix] of Object.entries(ROLE_PREFIXES)) {
  Object.defineProperty(accounts, role, {
    enumerable: true,
    get() {
      return getAccounts(prefix);
    },
  });
}

module.exports = { accounts };

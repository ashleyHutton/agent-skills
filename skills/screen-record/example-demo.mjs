// Copy this per demo, and keep the copy outside the repo being demoed.
// Setup isn't recorded, so sign in there.
export async function setup(r) {
  await r.page.goto(r.url("/users/sign_in"))
  await r.page.fill("input[type=email]", "user@example.com")
  await r.page.fill("input[type=password]", "password")
  await r.page.click("input[type=submit],button[type=submit]")
  await r.page.waitForURL((url) => !url.pathname.includes("sign_in"))
  await r.goto("/items")
}

export async function run(r) {
  await r.caption("Search the list")
  await r.type("input[name=q]", "widget")
  await r.settle()
  await r.expectText("Blue Widget")
  await r.pause(1000)

  await r.caption("Open one and edit it")
  await r.click(r.page.getByRole("link", { name: "Blue Widget" }))
  await r.click(r.page.getByRole("link", { name: "Edit", exact: true }))
  await r.type("input[name='item[name]']", "Red Widget", { clear: true })
  await r.click(r.page.getByRole("button", { name: "Save" }))
  await r.expectText("Red Widget")
  await r.pause(1500)
  await r.caption("")
}
